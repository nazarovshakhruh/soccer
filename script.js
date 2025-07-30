function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    
    document.getElementById('datetime').textContent = now.toLocaleString('en-GB', options);
}

setInterval(updateDateTime, 1000); // update every second
updateDateTime(); // initial call
