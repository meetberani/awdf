import React, { useState } from "react";

function Contact() {
  const [message, setMessage] = useState("");

  return (
    <div
      style={{
        margin: "20px",
        padding: "20px",
        backgroundColor: "#f5f5f5",
        borderRadius: "10px",
      }}
    >
      <h1
        style={{
          color: "#0d6efd",
          textAlign: "center",
        }}
      >
        Contact
      </h1>

      <input
        type="text"
        placeholder="Enter your message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{
          width: "300px",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "5px",
        }}
      />

      <br />
      <br />

      <h3 style={{ color: "#198754" }}>Your Message:</h3>

      <p
        style={{
          color: "#444",
          fontSize: "18px",
        }}
      >
        {message}
      </p>
    </div>
  );
}

export default Contact;