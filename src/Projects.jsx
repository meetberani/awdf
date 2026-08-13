import React, { useEffect, useState } from "react";
import Spinner from "./components/Spinner";
import ErrorMessage from "./components/ErrorMessage";

function Projects() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const fetchRepos = () => {
    setLoading(true);
    setError(null);

    fetch("https://api.github.com/users/meetberani/repos")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch GitHub repositories");
        }

        return response.json();
      })
      .then((data) => {
        setRepos(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={fetchRepos}
      />
    );
  }

  const filteredRepos = repos.filter((repo) =>
    repo.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        margin: "20px",
        backgroundColor: "#f5f5f5",
        padding: "20px",
        borderRadius: "10px"
      }}
    >
      <h1
        style={{
          color: "#0d6efd",
          textAlign: "center"
        }}
      >
        My GitHub Projects
      </h1>

      <div
        style={{
          textAlign: "center",
          marginBottom: "25px"
        }}
      >
        <input
          type="text"
          placeholder="Search repository..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "80%",
            maxWidth: "500px",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "16px"
          }}
        />
      </div>

      {filteredRepos.length === 0 ? (
        <p style={{ textAlign: "center" }}>
          No repositories found.
        </p>
      ) : (
        filteredRepos.map((repo) => (
          <div
            key={repo.id}
            style={{
              marginBottom: "20px",
              padding: "20px",
              backgroundColor: "white",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
            }}
          >
            <h2 style={{ color: "#198754" }}>
              {repo.name}
            </h2>

            <a
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#0d6efd",
                textDecoration: "none",
                fontWeight: "bold"
              }}
            >
              View Repository →
            </a>
          </div>
        ))
      )}
    </div>
  );
}

export default Projects;