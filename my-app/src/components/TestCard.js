  return (
    <div className="test-card">
      <h3>{test.title}</h3>
      <p>{test.test_description}</p>
      <div className="test-info">
        <span>Duration: {test.duration_minutes} min</span>
        <span>Questions: {test.question_count}</span>
      </div>
    </div>
  ); 