
const test = async () => {
  try {
    const resp = await fetch('http://localhost:7000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'adm-001',
        password: 'admin123',
        role: 'admin'
      })
    });
    const data = await resp.json();
    console.log('Status:', resp.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch Error:', err);
  }
};

test();
