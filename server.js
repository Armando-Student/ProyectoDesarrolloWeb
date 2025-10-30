const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// ==================== CONFIGURACIÓN CORS ====================
app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sin origin (Postman, mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        // En desarrollo, ser más permisivo
        if (process.env.NODE_ENV !== 'production') {
            console.log('✅ CORS allowing origin (dev):', origin);
            return callback(null, true);
        }
        
        // En producción, también permitir cualquier origen
        console.log('✅ CORS allowing origin (production):', origin);
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Manejar preflight requests
app.options('*', cors());

// ==================== CONEXIÓN BASE DE DATOS ====================
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false  // Aiven requiere SSL
    },
    connectTimeout: 60000
});


// Conectar a la base de datos
db.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err);
        return;
    }
    console.log('✅ Conectado a la base de datos MySQL');
});

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    jwt.verify(token, 'SECRET_KEY', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido o expirado' });
        }
        req.user = user;
        next();
    });
};

// Middleware para verificar administrador
const isAdmin = (req, res, next) => {
    const userId = req.user.id;
    const sql = 'SELECT is_admin FROM users WHERE id = ?';
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0 || !results[0].is_admin) {
            return res.status(403).json({ error: 'Acceso denegado. Se requieren privilegios de administrador.' });
        }
        next();
    });
};

// ==================== RUTAS PÚBLICAS ====================

app.get('/api/health', (req, res) => {
    res.json({
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
        db.query(sql, [name, email, hashedPassword], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
                }
                return res.status(500).json({ error: 'Error en el servidor: ' + err.message });
            }

            res.status(201).json({
                message: 'Usuario registrado exitosamente',
                userId: result.insertId
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error en el servidor: ' + err.message });
        }

        if (results.length === 0) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        const user = results[0];

        if (!user.is_active) {
            return res.status(400).json({ error: 'Cuenta suspendida' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                is_admin: user.is_admin
            },
            'SECRET_KEY',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                balance: user.balance,
                is_admin: user.is_admin
            }
        });
    });
});

app.get('/api/cryptocurrencies', (req, res) => {
    const sql = 'SELECT * FROM cryptocurrencies ORDER BY name';
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error obteniendo criptomonedas: ' + err.message });
        }
        res.json(results);
    });
});

// ==================== RUTAS PROTEGIDAS ====================

app.get('/api/profile', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const sql = 'SELECT id, name, email, balance, is_admin, created_at FROM users WHERE id = ?';
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        res.json(results[0]);
    });
});

app.get('/api/portfolio', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const sql = `
        SELECT 
            c.id,
            c.symbol, 
            c.name, 
            c.current_price,
            SUM(CASE WHEN t.type = 'buy' THEN t.amount ELSE -t.amount END) as amount
        FROM transactions t
        JOIN cryptocurrencies c ON t.crypto_id = c.id
        WHERE t.user_id = ?
        GROUP BY c.id
        HAVING amount > 0
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/transactions', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const sql = `
        SELECT 
            t.*, 
            c.symbol, 
            c.name 
        FROM transactions t 
        JOIN cryptocurrencies c ON t.crypto_id = c.id 
        WHERE t.user_id = ? 
        ORDER BY t.created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/transaction/buy', authenticateToken, (req, res) => {
    const { crypto_id, amount } = req.body;
    const user_id = req.user.id;

    if (!crypto_id || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    const cryptoQuery = 'SELECT * FROM cryptocurrencies WHERE id = ?';
    db.query(cryptoQuery, [crypto_id], (err, cryptoResults) => {
        if (err) return res.status(500).json({ error: err.message });
        if (cryptoResults.length === 0) return res.status(404).json({ error: 'Criptomoneda no encontrada' });

        const crypto = cryptoResults[0];
        const totalCost = amount * crypto.current_price;

        const userQuery = 'SELECT balance FROM users WHERE id = ?';
        db.query(userQuery, [user_id], (err, userResults) => {
            if (err) return res.status(500).json({ error: err.message });
            if (userResults.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

            const userBalance = parseFloat(userResults[0].balance);
            if (userBalance < totalCost) {
                return res.status(400).json({ error: 'Saldo insuficiente' });
            }

            const newBalance = userBalance - totalCost;
            const updateUser = 'UPDATE users SET balance = ? WHERE id = ?';
            const insertTransaction = 'INSERT INTO transactions (user_id, crypto_id, type, amount, price, total) VALUES (?, ?, buy ?, ?, ?)';

            db.beginTransaction(err => {
                if (err) return res.status(500).json({ error: err.message });

                db.query(updateUser, [newBalance, user_id], (err) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ error: err.message });
                        });
                    }

                    db.query(insertTransaction, [user_id, crypto_id, amount, crypto.current_price, totalCost], (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                res.status(500).json({ error: err.message });
                            });
                        }

                        db.commit(err => {
                            if (err) {
                                return db.rollback(() => {
                                    res.status(500).json({ error: err.message });
                                });
                            }

                            res.json({
                                message: 'Compra realizada exitosamente',
                                new_balance: newBalance,
                                transaction_id: result.insertId
                            });
                        });
                    });
                });
            });
        });
    });
});

app.post('/api/transaction/sell', authenticateToken, (req, res) => {
    const { crypto_id, amount } = req.body;
    const user_id = req.user.id;

    if (!crypto_id || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    const portfolioQuery = `
        SELECT 
            c.id,
            c.symbol, 
            c.name, 
            c.current_price,
            SUM(CASE WHEN t.type = 'buy' THEN t.amount ELSE -t.amount END) as owned_amount
        FROM transactions t
        JOIN cryptocurrencies c ON t.crypto_id = c.id
        WHERE t.user_id = ? AND t.crypto_id = ?
        GROUP BY c.id
    `;

    db.query(portfolioQuery, [user_id, crypto_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0 || results[0].owned_amount < amount) {
            return res.status(400).json({ error: 'No tienes suficiente cantidad de esta criptomoneda' });
        }

        const crypto = results[0];
        const totalValue = amount * crypto.current_price;

        const updateUser = 'UPDATE users SET balance = balance + ? WHERE id = ?';
        const insertTransaction = 'INSERT INTO transactions (user_id, crypto_id, type, amount, price, total) VALUES (?, ?, "sell", ?, ?, ?)';

        db.beginTransaction(err => {
            if (err) return res.status(500).json({ error: err.message });

            db.query(updateUser, [totalValue, user_id], (err) => {
                if (err) {
                    return db.rollback(() => {
                        res.status(500).json({ error: err.message });
                    });
                }

                db.query(insertTransaction, [user_id, crypto_id, amount, crypto.current_price, totalValue], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ error: err.message });
                        });
                    }

                    db.commit(err => {
                        if (err) {
                            return db.rollback(() => {
                                res.status(500).json({ error: err.message });
                            });
                        }

                        db.query('SELECT balance FROM users WHERE id = ?', [user_id], (err, balanceResults) => {
                            if (err) {
                                return res.json({
                                    message: 'Venta realizada exitosamente',
                                    transaction_id: result.insertId
                                });
                            }

                            res.json({
                                message: 'Venta realizada exitosamente',
                                new_balance: balanceResults[0].balance,
                                transaction_id: result.insertId
                            });
                        });
                    });
                });
            });
        });
    });
});

// ==================== MANEJO DE RUTAS NO ENCONTRADAS ====================

// FORMA CORRECTA - Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        method: req.method
    });
});

// ==================== INICIAR SERVIDOR ====================

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`\n📋 Endpoints disponibles:`);
    console.log(`   POST /api/register - Registrar usuario`);
    console.log(`   POST /api/login - Iniciar sesión`);
    console.log(`   GET  /api/cryptocurrencies - Listar criptomonedas`);
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Apagando servidor...');
    db.end();
    process.exit(0);
});
