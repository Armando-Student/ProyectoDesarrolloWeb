document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación y permisos de admin
    checkAdminAuth();
    
    // Cargar datos del panel de administración
    loadAdminData();
    
    // Event listeners
    document.getElementById('logoutBtn').addEventListener('click', logout);
});

function checkAdminAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Verificar si es administrador
    if (user.role !== 'admin') {
        showAlert('No tienes permisos para acceder al panel de administración', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }
    
    document.getElementById('userWelcome').textContent = `Bienvenido, ${user.name} (Admin)`;
}

function loadAdminData() {
    loadAdminStats();
    loadUsersTable();
    loadTransactionReports();
}

function loadAdminStats() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    
    // Estadísticas generales
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalTransactions').textContent = transactions.length;
    
    // Volumen total (suma de todas las transacciones)
    const totalVolume = transactions.reduce((sum, transaction) => sum + transaction.total, 0);
    document.getElementById('totalVolume').textContent = 
        `$${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    
    // Usuarios activos (que tienen al menos 1 transacción)
    const usersWithTransactions = new Set(transactions.map(t => t.userId || t.email));
    document.getElementById('activeUsers').textContent = usersWithTransactions.size;
}

function loadUsersTable() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const tableBody = document.getElementById('usersTable');
    
    tableBody.innerHTML = '';
    
    if (users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #666;">
                    No hay usuarios registrados en el sistema
                </td>
            </tr>
        `;
        return;
    }
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        // Determinar estado del usuario
        let status = 'status-active';
        let statusText = 'Activo';
        
        if (user.suspended) {
            status = 'status-suspended';
            statusText = 'Suspendido';
        } else if (!user.lastLogin) {
            status = 'status-inactive';
            statusText = 'Inactivo';
        }
        
        row.innerHTML = `
            <td>
                <strong>${user.name}</strong>
                ${user.role === 'admin' ? ' 👑' : ''}
            </td>
            <td>${user.email}</td>
            <td>$${user.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</td>
            <td>${new Date(user.createdAt).toLocaleDateString('es-ES')}</td>
            <td>
                <span class="user-status ${status}">${statusText}</span>
            </td>
            <td>
                ${user.role !== 'admin' ? `
                    ${!user.suspended ? 
                        `<button class="btn-action btn-suspend" onclick="suspendUser('${user.email}')">Suspender</button>` :
                        `<button class="btn-action btn-activate" onclick="activateUser('${user.email}')">Activar</button>`
                    }
                    <button class="btn-action btn-delete" onclick="deleteUser('${user.email}')">Eliminar</button>
                ` : '<em>Administrador</em>'}
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function loadTransactionReports() {
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    
    if (transactions.length === 0) {
        document.getElementById('mostBoughtCrypto').textContent = 'No hay datos';
        document.getElementById('mostSoldCrypto').textContent = 'No hay datos';
        document.getElementById('mostActiveUser').textContent = 'No hay datos';
        document.getElementById('largestTransaction').textContent = 'No hay datos';
        return;
    }
    
    // Criptomoneda más comprada
    const boughtTransactions = transactions.filter(t => t.type === 'buy');
    const cryptoBuys = {};
    boughtTransactions.forEach(t => {
        cryptoBuys[t.crypto] = (cryptoBuys[t.crypto] || 0) + t.amount;
    });
    
    const mostBought = Object.entries(cryptoBuys).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0]);
    document.getElementById('mostBoughtCrypto').textContent = 
        mostBought[0] ? `${mostBought[0]} (${mostBought[1].toFixed(2)})` : 'No hay compras';
    
    // Criptomoneda más vendida
    const soldTransactions = transactions.filter(t => t.type === 'sell');
    const cryptoSells = {};
    soldTransactions.forEach(t => {
        cryptoSells[t.crypto] = (cryptoSells[t.crypto] || 0) + t.amount;
    });
    
    const mostSold = Object.entries(cryptoSells).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0]);
    document.getElementById('mostSoldCrypto').textContent = 
        mostSold[0] ? `${mostSold[0]} (${mostSold[1].toFixed(2)})` : 'No hay ventas';
    
    // Usuario más activo (simulación - en un sistema real tendrías user IDs)
    const userActivity = {};
    transactions.forEach(t => {
        const user = t.userId || 'Usuario Demo';
        userActivity[user] = (userActivity[user] || 0) + 1;
    });
    
    const mostActive = Object.entries(userActivity).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0]);
    document.getElementById('mostActiveUser').textContent = 
        `${mostActive[0]} (${mostActive[1]} transacciones)`;
    
    // Transacción más grande
    const largestTransaction = transactions.reduce((a, b) => a.total > b.total ? a : b, { total: 0 });
    document.getElementById('largestTransaction').textContent = 
        largestTransaction.total > 0 ? 
        `$${largestTransaction.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} - ${largestTransaction.crypto}` : 
        'No hay transacciones';
}

function suspendUser(email) {
    if (!confirm(`¿Estás seguro de que quieres suspender al usuario ${email}?`)) {
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.email === email);
    
    if (userIndex !== -1) {
        users[userIndex].suspended = true;
        localStorage.setItem('users', JSON.stringify(users));
        showAlert(`Usuario ${email} suspendido correctamente`, 'success');
        loadUsersTable();
    }
}

function activateUser(email) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.email === email);
    
    if (userIndex !== -1) {
        users[userIndex].suspended = false;
        localStorage.setItem('users', JSON.stringify(users));
        showAlert(`Usuario ${email} activado correctamente`, 'success');
        loadUsersTable();
    }
}

function deleteUser(email) {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    
    if (email === currentUser.email) {
        showAlert('No puedes eliminar tu propia cuenta', 'error');
        return;
    }
    
    if (!confirm(`¿Estás seguro de que quieres ELIMINAR permanentemente al usuario ${email}? Esta acción no se puede deshacer.`)) {
        return;
    }
    
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    users = users.filter(u => u.email !== email);
    
    localStorage.setItem('users', JSON.stringify(users));
    showAlert(`Usuario ${email} eliminado correctamente`, 'success');
    loadAdminData(); // Recargar todos los datos
}

function showAlert(message, type) {
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    if (type === 'error') {
        alert.style.background = '#e74c3c';
    } else {
        alert.style.background = '#27ae60';
    }
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Agregar estilos para la animación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);