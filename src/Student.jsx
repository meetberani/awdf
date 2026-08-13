import React from "react";

const Student = () => {
  const student = {
    name: "MEETBHAI BERANI",
    course: "CE",
    college: "CHARUSAT University",
    about:
      "I am a CE student. I am learning React.js, Node.js and Web Development.",
    skills: ["HTML", "CSS", "JavaScript", "React.js", "Node.js"]
  };

  return (
    <div>
      
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <h1>{student.name}</h1>
        <h3>{student.course}</h3>
      </div>

      
      <div style={{ margin: "20px" }}>
        <h2>About Me</h2>
        <p>{student.about}</p>
      </div>

     
      <footer
        style={{
          background: "#f2f2f2",
          padding: "20px",
          marginTop: "30px"
        }}
      >
        <h2>Skills</h2>

        <ul>
          {student.skills.map((skill, index) => (
            <li key={index}>{skill}</li>
          ))}
        </ul>
      </footer>
    </div>
  );
};

export default Student;