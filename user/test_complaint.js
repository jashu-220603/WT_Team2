// test_complaint.js
async function run() {
  try {
    const ts = Date.now();
    // Register
    const regRes = await fetch("http://localhost:7000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: `test${ts}@example.com`,
        password: "password123",
        role: "user"
      })
    });
    const regData = await regRes.json();
    console.log("Register:", regData);
    
    if (!regData.token) return;

    // Create complaint
    // Note: To simulate FormData we use simple fetch but maybe we should use node-fetch or similar?
    // Actually, backend has `upload.single('image')`. If Content-Type is application/json, multer might not parse it.
    // Wait, the backend complains: if we send multipart, it parses. If we don't send image, does multer crash?
    // Multer `upload.single('image')` supports multipart. If we send application/json, it might not populate req.body if it expects multipart.
    // Let's check if the backend `app.use(express.json())` parses json before multer.
    
    // We will use standard form-data using native fetch (Node 18+)
    const formData = new FormData();
    formData.append("title", "Test File");
    formData.append("description", "A description here");
    formData.append("category", "Cyber Crime");
    formData.append("location", "Test City");
    
    const compRes = await fetch("http://localhost:7000/api/complaints", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${regData.token}`
      },
      body: formData
    });
    
    const compData = await compRes.json();
    console.log("Complaint Submission Response:", JSON.stringify(compData, null, 2));

  } catch(err){
    console.error(err);
  }
}
run();
