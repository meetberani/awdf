import React from "react";
const StudentList = () => {
  const students = [
    { id: 1, skill: "Node.js" },
    { id: 2, skill: "React.js" },
    { id: 3, skill: "Python" }
  ];

  return (
    <div>
      {students.map((s) => (
        <p key={s.id}>
          ID: {s.id} | Skill: {s.skill}
        </p>
      ))}
    </div>
  );
};

export default StudentList;

