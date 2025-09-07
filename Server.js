const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());
app.use(cors());



// R Servidor
app.get('/api/health', (req, res) => {
    res.json({
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});



// IniServidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`Health check disponible en: http://localhost:${PORT}/api/health`);
});

// Manejo de cierre
process.on('SIGINT', () => {
    console.log('\n El Servidor ha sido cerrado ...');

});
