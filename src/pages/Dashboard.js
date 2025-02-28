import React from 'react';
import '../styles/Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <header className="dashboard-header">
        <div className="greeting-section">
          <div className="time-greeting">
            <span className="sun-icon">☀️</span>
            <span className="greeting-text">GOOD MORNING</span>
          </div>
          <h1 className="user-name">Anil</h1>
          <div className="exam-selector">
            <span>Exam: SSC</span>
          </div>
        </div>
        <div className="profile-avatar">
          {/* Profile image placeholder */}
        </div>
      </header>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="custom-test-btn">
          <span className="plus-icon">+</span>
          Create a custom test
          <span className="test-icon">🎯</span>
        </button>
        <button className="random-test-btn">
          <span className="plus-icon">+</span>
          Create a random test
          <span className="random-icon">🎲</span>
        </button>
      </div>

      {/* Tests Section */}
      <section className="tests-section">
        <div className="tests-header">
          <h2>All Tests</h2>
          <span className="see-all">See all</span>
        </div>

        {/* Test Categories */}
        <div className="test-categories">
          <button className="category active">All test</button>
          <button className="category">Recommended test</button>
          <button className="category">Custom test</button>
        </div>

        {/* Test List */}
        <div className="test-list">
          <div className="test-item">
            <div className="test-info">
              <h3>Test 1</h3>
              <p>100 questions · 2hrs</p>
            </div>
            <span className="arrow">→</span>
          </div>

          <div className="test-item">
            <div className="test-info">
              <h3>Test 2</h3>
              <p>100 questions · 2hrs</p>
            </div>
            <div className="score">Score 20/300</div>
          </div>

          <div className="test-item">
            <div className="test-info">
              <h3>Test 3</h3>
              <p>100 questions · 2hrs</p>
            </div>
            <span className="arrow">→</span>
          </div>

          <div className="test-item">
            <div className="test-info">
              <h3>Test 4</h3>
              <p>100 questions · 2hrs</p>
            </div>
            <span className="arrow">→</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard; 