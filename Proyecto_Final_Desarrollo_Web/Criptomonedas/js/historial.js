document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    checkAuth();
    
    // Cargar historial
    loadHistorial();
    
    // Event listeners
    document.getElementById('filterType').addEventListener('change', applyFilters);
    document.getElementById('filterCrypto').addEventListener('change', applyFilters);
    document.getElementById('filterDate').addEventListener('change', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    document.getElementById('logoutBtn').addEventListener('click', logout);
});

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('userWelcome').textContent = `Bienvenido, ${user.name}`;
}

async function loadHistorial() {
    try {
        const endpoint = '/api/transactions';
        const result = (typeof apiRequest === 'function')
            ? await apiRequest(endpoint, { method: 'GET' })
            : await (async () => {
                const url = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL + endpoint : 'https://proyectodesarrolloweb-production.up.railway.app' + endpoint;
                const res = await fetch(url, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}) }
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.json();
            })();

        // Normalizar la respuesta del servidor: puede devolver un array directo o un objeto { transactions: [...] }
        let transactions = [];
        if (Array.isArray(result)) {
            transactions = result;
        } else if (result && Array.isArray(result.transactions)) {
            transactions = result.transactions;
        } else if (result && Array.isArray(result.data)) {
            transactions = result.data;
        }

        // Mapear campos para asegurar compatibilidad con el render y normalizar números
        const safeNumber = v => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
        };

        transactions = transactions.map(t => ({
            date: t.date || t.created_at || t.createdAt || t.timestamp,
            type: t.type,
            crypto: t.crypto || t.name || t.crypto_name || t.symbol_name,
            symbol: t.symbol || t.crypto_symbol || (t.crypto ? (t.crypto.symbol || '') : ''),
            amount: safeNumber(t.amount),
            price: safeNumber(t.price),
            total: safeNumber(t.total) || (safeNumber(t.price) * safeNumber(t.amount))
        }));

        // Mostrar estadísticas
        showStats(transactions);

        // Mostrar transacciones
        if (transactions.length === 0) {
            showEmptyState();
        } else {
            renderTransactions(transactions);
        }
    } catch (err) {
        console.error('Error loading transaction history:', err);
        showEmptyState();
    }
}

function showStats(transactions) {
    // Asegurar que amount/price/total son números y calcular totals con seguridad
    const safeNumber = v => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const totalCompras = transactions
        .filter(t => t.type === 'buy')
        .reduce((sum, t) => {
            const total = safeNumber(t.total) || (safeNumber(t.price) * safeNumber(t.amount));
            return sum + total;
        }, 0);

    const totalVentas = transactions
        .filter(t => t.type === 'sell')
        .reduce((sum, t) => {
            const total = safeNumber(t.total) || (safeNumber(t.price) * safeNumber(t.amount));
            return sum + total;
        }, 0);

    document.getElementById('totalCompras').textContent = 
        `$${totalCompras.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    document.getElementById('totalVentas').textContent = 
        `$${totalVentas.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    document.getElementById('totalTransacciones').textContent = transactions.length;
}

function renderTransactions(transactions) {
    const tableBody = document.getElementById('transactionsTable');
    const noTransactions = document.getElementById('noTransactions');
    
    // Ocultar mensaje de no transacciones
    noTransactions.style.display = 'none';
    
    // Ordenar por fecha (más reciente primero)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tableBody.innerHTML = '';
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        const fecha = new Date(transaction.date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const tipoTexto = transaction.type === 'buy' ? 'Compra' : 'Venta';
        const tipoClase = transaction.type === 'buy' ? 'type-compra' : 'type-venta';
        const signoClase = transaction.type === 'buy' ? 'transaction-negative' : 'transaction-positive';
        const signo = transaction.type === 'buy' ? '-' : '+';
        
        row.innerHTML = `
            <td>${fecha}</td>
            <td>
                <span class="transaction-type-badge ${tipoClase}">
                    ${tipoTexto}
                </span>
            </td>
            <td>
                <div class="transaction-crypto">
                    <div class="crypto-icon">${transaction.symbol.charAt(0)}</div>
                    ${transaction.crypto} (${transaction.symbol})
                </div>
            </td>
            <td>${transaction.amount}</td>
            <td>$${transaction.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="${signoClase}">${signo}$${transaction.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="status-completed">Completado</td>
        `;
        
        tableBody.appendChild(row);
    });
}

async function applyFilters() {
    try {
        const typeFilter = document.getElementById('filterType').value;
        const cryptoFilter = document.getElementById('filterCrypto').value;
        const dateFilter = document.getElementById('filterDate').value;
        
        // Obtener todas las transacciones del servidor y filtrar en cliente (por si el backend no soporta filtros)
        const endpoint = '/api/transactions';
        const result = (typeof apiRequest === 'function')
            ? await apiRequest(endpoint, { method: 'GET' })
            : await (async () => {
                const url = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL + endpoint : 'https://proyectodesarrolloweb-production.up.railway.app' + endpoint;
                const res = await fetch(url, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}) }
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.json();
            })();

        let transactions = [];
        if (Array.isArray(result)) transactions = result;
        else if (result && Array.isArray(result.transactions)) transactions = result.transactions;

        // Mapear campos como en loadHistorial y normalizar números
        const safeNumber2 = v => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
        };

        transactions = transactions.map(t => ({
            date: t.date || t.created_at || t.createdAt || t.timestamp,
            type: t.type,
            crypto: t.crypto || t.name || t.crypto_name || t.symbol_name,
            symbol: t.symbol || t.crypto_symbol || (t.crypto ? (t.crypto.symbol || '') : ''),
            amount: safeNumber2(t.amount),
            price: safeNumber2(t.price),
            total: safeNumber2(t.total) || (safeNumber2(t.price) * safeNumber2(t.amount))
        }));

        // Aplicar filtros en cliente
        let filtered = transactions.slice();
        if (typeFilter !== 'all') filtered = filtered.filter(t => t.type === typeFilter);
        if (cryptoFilter !== 'all') filtered = filtered.filter(t => (t.crypto || '').toLowerCase().includes(cryptoFilter.toLowerCase()));
        if (dateFilter) filtered = filtered.filter(t => {
            const d = new Date(t.date).toISOString().slice(0,10);
            return d === dateFilter;
        });

        if (filtered.length === 0) showEmptyState(); else renderTransactions(filtered);
        showStats(filtered);
    } catch (err) {
        console.error('Error applying filters:', err);
        showEmptyState();
    }
}

function clearFilters() {
    document.getElementById('filterType').value = 'all';
    document.getElementById('filterCrypto').value = 'all';
    document.getElementById('filterDate').value = '';
    
    // Recargar historial completo
    loadHistorial();
}

function showEmptyState() {
    const tableBody = document.getElementById('transactionsTable');
    const noTransactions = document.getElementById('noTransactions');
    
    tableBody.innerHTML = '';
    noTransactions.style.display = 'block';
    
    // Reiniciar estadísticas
    document.getElementById('totalCompras').textContent = '$0.00';
    document.getElementById('totalVentas').textContent = '$0.00';
    document.getElementById('totalTransacciones').textContent = '0';
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Sample transactions are now managed through the server API