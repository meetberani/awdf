function Spinner() {
  return (
    <div
      style={{
        textAlign: "center",
        marginTop: "50px"
      }}
    >
      <h2>Loading Projects...</h2>

      <div
        style={{
          width: "40px",
          height: "40px",
          margin: "20px auto",
          border: "5px solid #ddd",
          borderTop: "5px solid #0d6efd",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}
      ></div>

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}

export default Spinner;