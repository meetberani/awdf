function ErrorMessage({ message, onRetry }) {
  return (
    <div
      style={{
        textAlign: "center",
        margin: "50px 20px",
        padding: "30px",
        backgroundColor: "#fff3f3",
        borderRadius: "10px"
      }}
    >
      <h2 style={{ color: "#dc3545" }}>
        Something went wrong
      </h2>

      <p style={{ color: "#444" }}>
        {message}
      </p>

      <button
        onClick={onRetry}
        style={{
          padding: "10px 20px",
          backgroundColor: "#0d6efd",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "16px"
        }}
      >
        Retry
      </button>
    </div>
  );
}

export default ErrorMessage;