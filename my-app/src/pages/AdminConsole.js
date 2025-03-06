import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import FileUploadModal from '../components/FileUploadModal';

// Security constants
const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds

const AdminConsole = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Security states
  const [deletePassword] = useState('admin123'); // In production, use more secure method
  const [deleteAttempts, setDeleteAttempts] = useState(0);
  
  // Data states
  const [exams, setExams] = useState([]);
  const [sections, setSections] = useState([]);
  const [tests, setTests] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [scoringModels, setScoringModels] = useState([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    totalTests: 0,
    totalQuestions: 0,
    activeUsers: 0,
    completedTests: 0
  });
  
  // Notification ref
  const notificationRef = useRef(null);
  
  // Add these new states after the existing state declarations
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmItemId, setConfirmItemId] = useState(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    difficulty: 'all',
    type: 'all'
  });
  
  // Add these state variables with the other state declarations
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemData, setNewItemData] = useState({});
  
  // Add this to your state declarations near the top of the component
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  
  useEffect(() => {
    checkAdminStatus();
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    } else {
      fetchData();
    }
  }, [activeTab]);

  useEffect(() => {
    // Clear error after 5 seconds
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data.role !== 'admin') {
        navigate('/');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'exams':
          await fetchExams();
          break;
        case 'sections':
          await fetchSections();
          break;
        case 'tests':
          await fetchTests();
          break;
        case 'questions':
          await fetchQuestions();
          break;
        case 'scoring':
          await fetchScoringModels();
          break;
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('id');
    
    if (error) throw error;
    setExams(data);
  };

  const fetchSections = async () => {
    const { data, error } = await supabase
      .from('exam_sections')
      .select(`
        *,
        exams(exam_name)
      `)
      .order('id');
    
    if (error) throw error;
    setSections(data);
  };

  const fetchTests = async () => {
    const { data, error } = await supabase
      .from('exam_tests')
      .select(`
        *,
        exam:exams (
          exam_name,
          exam_description
        ),
        exam_test_questions (
          id,
          question:questions (
            question_text,
            question_type
          )
        )
      `)
      .order('id');
    
    if (error) throw error;
    setTests(data);
  };

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('questions')
      .select(`
        *,
        exam:exams (exam_name),
        section:exam_sections (section_name)
      `)
      .order('id');
    
    if (error) throw error;
    setQuestions(data);
  };

  const fetchScoringModels = async () => {
    const { data, error } = await supabase
      .from('scoring_models')
      .select('*')
      .order('id');
    
    if (error) throw error;
    setScoringModels(data);
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // Get total exams
      const { count: examCount, error: examsError } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true });
      
      if (examsError) throw examsError;
      
      // Get total tests
      const { count: testCount, error: testsError } = await supabase
        .from('exam_tests')
        .select('*', { count: 'exact', head: true });
      
      if (testsError) throw testsError;
      
      // Get total questions
      const { count: questionCount, error: questionsError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });
      
      if (questionsError) throw questionsError;
      
      // Get active users (users who have taken tests)
      const { count: activeUserCount, error: usersError } = await supabase
        .from('user_tests')
        .select('user_id', { count: 'exact', head: true });
      
      if (usersError) throw usersError;
      
      // Get completed tests
      const { count: completedTestCount, error: completedError } = await supabase
        .from('user_tests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');
      
      if (completedError) throw completedError;
      
      setStats({
        totalExams: examCount || 0,
        totalTests: testCount || 0,
        totalQuestions: questionCount || 0,
        activeUsers: activeUserCount || 0,
        completedTests: completedTestCount || 0
      });
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    // Check if user is locked out
    if (deleteAttempts >= MAX_ATTEMPTS) {
      setError(`Too many failed attempts. Please try again in ${Math.ceil(LOCKOUT_TIME/60000)} minutes`);
      return;
    }

    let itemDetails = '';
    let itemType = activeTab.slice(0, -1);
    
    switch (activeTab) {
      case 'exams':
        itemDetails = exams.find(e => e.id === id)?.exam_name || '';
        break;
      case 'tests':
        itemDetails = tests.find(t => t.id === id)?.test_name || '';
        break;
      case 'questions':
        itemDetails = questions.find(q => q.id === id)?.question_text || '';
        if (itemDetails.length > 50) {
          itemDetails = itemDetails.substring(0, 50) + '...';
        }
        break;
    }
    
    confirmDialog(
      'delete', 
      id, 
      `Delete ${itemType}`, 
      `Are you sure you want to delete this ${itemType}?\n\n"${itemDetails}"`
    );
  };

  const handleEdit = async (item) => {
    try {
      setError(null);
      let error;

      switch (activeTab) {
        case 'exams':
          const newExamName = prompt('Enter new exam name:', item.exam_name);
          // If user clicks Cancel, just return without error
          if (newExamName === null) {
            return;
          }
          // If user submits empty value
          if (newExamName.trim() === '') {
            setError('Exam name cannot be empty');
            return;
          }

          const newExamDesc = prompt('Enter new description:', item.exam_description);
          // If user clicks Cancel on description, keep old description
          const finalExamDesc = newExamDesc === null ? item.exam_description : newExamDesc;
          
          // If user clicks Cancel on confirm, keep old status
          const isExamActive = window.confirm('Is this exam active?');

          const { error: examError } = await supabase
            .from('exams')
            .update({
              exam_name: newExamName,
              exam_description: finalExamDesc,
              is_active: isExamActive
            })
            .eq('id', item.id);
          error = examError;
          break;

        case 'tests':
          const newTestName = prompt('Enter new test name:', item.test_name);
          if (newTestName === null) {
            return;
          }
          if (newTestName.trim() === '') {
            setError('Test name cannot be empty');
            return;
          }

          const newTotalQuestions = prompt('Enter total questions:', item.total_questions);
          if (newTotalQuestions === null) {
            return;
          }
          if (isNaN(parseInt(newTotalQuestions))) {
            setError('Please enter a valid number for total questions');
            return;
          }

          const newDuration = prompt('Enter duration (in minutes):', item.duration);
          if (newDuration === null) {
            return;
          }
          if (isNaN(parseInt(newDuration))) {
            setError('Please enter a valid number for duration');
            return;
          }

          const isTestActive = window.confirm('Is this test active?');

          const { error: testError } = await supabase
            .from('exam_tests')
            .update({
              test_name: newTestName,
              total_questions: parseInt(newTotalQuestions),
              duration: parseInt(newDuration),
              is_active: isTestActive
            })
            .eq('id', item.id);
          error = testError;
          break;

        case 'questions':
          const newQuestionText = prompt('Enter new question text:', item.question_text);
          if (newQuestionText === null) {
            return;
          }
          if (newQuestionText.trim() === '') {
            setError('Question text cannot be empty');
            return;
          }

          const newQuestionType = prompt('Enter question type (MCQ/TRUE_FALSE/NUMERIC/FILL_BLANK):', item.question_type);
          if (newQuestionType === null) {
            return;
          }
          if (!['MCQ', 'TRUE_FALSE', 'NUMERIC', 'FILL_BLANK'].includes(newQuestionType)) {
            setError('Invalid question type');
            return;
          }

          const newDifficulty = prompt('Enter difficulty (Easy/Medium/Hard):', item.difficulty);
          if (newDifficulty === null) {
            return;
          }
          if (!['Easy', 'Medium', 'Hard'].includes(newDifficulty)) {
            setError('Invalid difficulty level');
            return;
          }

          const isQuestionActive = window.confirm('Is this question active?');

          const { error: questionError } = await supabase
            .from('questions')
            .update({
              question_text: newQuestionText,
              question_type: newQuestionType,
              difficulty: newDifficulty,
              is_active: isQuestionActive
            })
            .eq('id', item.id);
          error = questionError;
          break;
      }

      if (error) throw error;
      
      // Show success message only if we got here (no cancellations)
      alert('Item updated successfully');
      fetchData(); // Refresh the list after update
    } catch (error) {
      setError(error.message);
    }
  };

  const handleShowAddModal = () => {
    // Reset form data
    setNewItemData({});
    setShowAddModal(true);
  };

  const handleAddItem = async () => {
    try {
      setError(null);
      
      // Validate required fields
      if (activeTab === 'exams' && !newItemData.exam_name) {
        setError('Exam name is required');
        return;
      }
      if (activeTab === 'sections' && (!newItemData.section_name || !newItemData.exam_id)) {
        setError('Section name and exam are required');
        return;
      }
      if (activeTab === 'tests' && (!newItemData.test_name || !newItemData.exam_id)) {
        setError('Test name and exam are required');
        return;
      }
      if (activeTab === 'scoring' && !newItemData.model_name) {
        setError('Model name is required');
        return;
      }
      
      let result;
      
      switch (activeTab) {
        case 'exams':
          result = await supabase.from('exams').insert({
            exam_name: newItemData.exam_name,
            exam_description: newItemData.exam_description || '',
            is_active: newItemData.is_active || true
          });
          break;
          
        case 'sections':
          result = await supabase.from('exam_sections').insert({
            section_name: newItemData.section_name,
            section_description: newItemData.section_description || '',
            exam_id: newItemData.exam_id
          });
          break;
          
        case 'tests':
          result = await supabase.from('exam_tests').insert({
            test_name: newItemData.test_name,
            exam_id: newItemData.exam_id,
            duration: newItemData.duration || 60,
            total_questions: newItemData.total_questions || 10,
            difficulty: newItemData.difficulty || 'mixed',
            type: newItemData.type || 'regular',
            is_active: newItemData.is_active || true
          });
          break;
          
        case 'scoring':
          result = await supabase.from('scoring_models').insert({
            model_name: newItemData.model_name,
            positive_marks: newItemData.positive_marks || 1,
            negative_marks: newItemData.negative_marks || 0,
            partial_allowed: newItemData.partial_allowed || false
          });
          break;
      }
      
      if (result.error) throw result.error;
      
      setSuccess(`New ${activeTab.slice(0, -1)} added successfully`);
      setShowAddModal(false);
      fetchData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleView = (item) => {
    switch (activeTab) {
      case 'tests':
        navigate(`/test/${item.id}`);
        break;
      case 'questions':
        alert(JSON.stringify(item, null, 2)); // For now, just show details
        break;
      default:
        break;
    }
  };

  const handleFileUpload = async (file, type) => {
    try {
      setError(null);
      // File upload logic here
      // You'll need to implement this based on your requirements
      setShowUploadModal(false);
      setSuccess("File uploaded successfully");
      fetchData();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
  };

  const handleUpload = async (files, type) => {
    try {
      setError(null);
      setLoading(true);
      
      if (!files || files.length === 0) {
        throw new Error('No files selected');
      }
      
      const file = files[0]; // For now, we'll handle just the first file
      
      if (file.type !== 'application/json' && 
          file.type !== 'text/csv' && 
          file.type !== 'application/vnd.ms-excel' && 
          file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        throw new Error('File must be JSON, CSV or Excel');
      }
      
      // Read the file
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          let data;
          
          // Parse file content
          if (file.type === 'application/json') {
            data = JSON.parse(e.target.result);
          } else {
            // For CSV/Excel, we'd need a parser library
            // This is a simplified placeholder - in a real app, use a CSV/Excel parser
            alert('CSV/Excel parsing would be implemented here');
            setLoading(false);
            return;
          }
          
          // Process the data based on type
          if (type === 'questions') {
            await processQuestionUpload(data);
          } else if (type === 'tests') {
            await processTestUpload(data);
          } else if (type === 'exams') {
            await processExamUpload(data);
          }
          
          setSuccess(`${type} uploaded successfully`);
          setShowUploadModal(false);
          fetchData(); // Refresh data
        } catch (error) {
          setError(`Error processing file: ${error.message}`);
        } finally {
          setLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError('Error reading file');
        setLoading(false);
      };
      
      reader.readAsText(file);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const processQuestionUpload = async (data) => {
    // Validate data
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array of questions');
    }
    
    // Check required fields
    const requiredFields = ['question_text', 'choices', 'correct_answer', 'exam_id'];
    
    for (const question of data) {
      for (const field of requiredFields) {
        if (!question[field]) {
          throw new Error(`Question missing required field: ${field}`);
        }
      }
      
      // Convert choices and correct_answer to JSONB if they're not already
      if (typeof question.choices === 'object' && !(question.choices instanceof String)) {
        question.choices = JSON.stringify(question.choices);
      }
      
      if (typeof question.correct_answer === 'object' && !(question.correct_answer instanceof String)) {
        question.correct_answer = JSON.stringify(question.correct_answer);
      }
    }
    
    // Insert questions in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('questions').insert(batch);
      
      if (error) throw error;
    }
    
    return true;
  };

  const processTestUpload = async (data) => {
    // Validate data
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array of tests');
    }
    
    // Check required fields
    const requiredFields = ['test_name', 'exam_id', 'duration', 'total_questions'];
    
    for (const test of data) {
      for (const field of requiredFields) {
        if (!test[field]) {
          throw new Error(`Test missing required field: ${field}`);
        }
      }
    }
    
    // Insert tests
    const { error } = await supabase.from('exam_tests').insert(data);
    
    if (error) throw error;
    
    return true;
  };

  const processExamUpload = async (data) => {
    // Validate data
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array of exams');
    }
    
    // Check required fields
    for (const exam of data) {
      if (!exam.exam_name) {
        throw new Error('Exam missing required field: exam_name');
      }
    }
    
    // Insert exams
    const { error } = await supabase.from('exams').insert(data);
    
    if (error) throw error;
    
    return true;
  };

  const handleShowUploadModal = () => {
    setShowUploadModal(true);
  };

  const renderDashboard = () => {
    return (
      <div style={styles.dashboardGrid}>
        {/* Stat cards */}
        <div style={styles.statsCard}>
          <div style={{...styles.statIcon, backgroundColor: `${colors.brandPrimary}15`}}>📚</div>
          <div style={styles.statContent}>
            <h3 style={typography.displayMdBold}>{stats.totalExams}</h3>
            <p style={{...typography.textSmRegular, color: colors.textSecondary}}>Total Exams</p>
          </div>
        </div>
        
        <div style={styles.statsCard}>
          <div style={{...styles.statIcon, backgroundColor: `${colors.accentSuccess}15`, color: colors.accentSuccess}}>📝</div>
          <div style={styles.statContent}>
            <h3 style={typography.displayMdBold}>{stats.totalTests}</h3>
            <p style={{...typography.textSmRegular, color: colors.textSecondary}}>Active Tests</p>
          </div>
        </div>
        
        <div style={styles.statsCard}>
          <div style={{...styles.statIcon, backgroundColor: `${colors.accentInfo}15`, color: colors.accentInfo}}>❓</div>
          <div style={styles.statContent}>
            <h3 style={typography.displayMdBold}>{stats.totalQuestions}</h3>
            <p style={{...typography.textSmRegular, color: colors.textSecondary}}>Questions</p>
          </div>
        </div>
        
        <div style={styles.statsCard}>
          <div style={{...styles.statIcon, backgroundColor: `${colors.accentWarning}15`, color: colors.accentWarning}}>👨‍💻</div>
          <div style={styles.statContent}>
            <h3 style={typography.displayMdBold}>{stats.activeUsers}</h3>
            <p style={{...typography.textSmRegular, color: colors.textSecondary}}>Active Users</p>
          </div>
        </div>
        
        {/* Quick actions */}
        <div style={styles.quickActionsCard}>
          <h3 style={typography.textLgBold}>Quick Actions</h3>
          <div style={styles.quickActions}>
            <button style={styles.quickActionButton} onClick={() => setActiveTab('exams')}>
              <span style={styles.actionIcon}>📚</span>
              Manage Exams
            </button>
            
            <button style={styles.quickActionButton} onClick={() => setActiveTab('tests')}>
              <span style={styles.actionIcon}>📝</span>
              Manage Tests
            </button>
            
            <button style={styles.quickActionButton} onClick={() => setActiveTab('questions')}>
              <span style={styles.actionIcon}>❓</span>
              Manage Questions
            </button>
            
            <button style={styles.quickActionButton} onClick={() => setShowUploadModal(true)}>
              <span style={styles.actionIcon}>📤</span>
              Upload Questions
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p style={typography.textMdRegular}>Loading...</p>
        </div>
      );
    }
    
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'exams':
        return renderExams();
      case 'sections':
        return renderSections();
      case 'tests':
        return renderTests();
      case 'questions':
        return renderQuestions();
      case 'scoring':
        return renderScoringModels();
      default:
        return null;
    }
  };

  const renderExams = () => {
    // Apply search and filters
    const filteredExams = applyFilters(exams);

    if (loading) return <div style={styles.loading}>Loading exams...</div>;
    if (error) return <div style={styles.error}>{error}</div>;
    
    return (
      <div>
        <div style={styles.tableControls}>
          <div style={styles.searchContainer}>
            <input 
              type="text"
              placeholder="Search exams..."
              style={styles.searchInput}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {renderFilters()}
        </div>
        
        {filteredExams.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyStateIcon}>📚</span>
            <h3 style={typography.textLgMedium}>
              {searchTerm || filters.status !== 'all' ? 'No matching exams found' : 'No exams found'}
            </h3>
            <p style={{...typography.textMdRegular, color: colors.textSecondary}}>
              {searchTerm || filters.status !== 'all' 
                ? 'Try adjusting your filters or search term' 
                : 'Create your first exam to get started'}
            </p>
            <button 
              style={styles.createButton}
              onClick={handleShowAddModal}
            >
              Create Exam
            </button>
          </div>
        ) : (
          <div style={styles.dataGrid}>
            {filteredExams.map(exam => (
              <div key={exam.id} style={styles.dataCard}>
                <div style={styles.dataCardContent}>
                  <h3 style={typography.textLgMedium}>{exam.exam_name}</h3>
                  <p style={{...typography.textSmRegular, color: colors.textSecondary, marginTop: '8px'}}>
                    {exam.exam_description || 'No description'}
                  </p>
                  
                  <div style={styles.dataCardMeta}>
                    <span style={exam.is_active ? styles.badge : styles.badgeSecondary}>
                      {exam.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div style={styles.dataCardActions}>
                  <button 
                    style={styles.editButton}
                    onClick={() => handleEdit(exam)}
                  >
                    Edit
                  </button>
                  <button 
                    style={styles.deleteButton}
                    onClick={() => handleDelete(exam.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSections = () => {
    // Add search/filter
    const filteredSections = sections;

    if (loading) return <div style={styles.loading}>Loading sections...</div>;
    if (error) return <div style={styles.error}>{error}</div>;
    if (!filteredSections?.length) {
      return (
        <div style={styles.emptyState}>
          <span style={styles.emptyStateIcon}>📑</span>
          <h3 style={typography.textLgMedium}>No sections found</h3>
          <p style={{...typography.textMdRegular, color: colors.textSecondary}}>
            Add exam sections to organize your content
          </p>
          <button 
            style={styles.createButton}
            onClick={handleShowAddModal}
          >
            Create Section
          </button>
        </div>
      );
    }

    return (
      <div>
        <div style={styles.searchContainer}>
          <input 
            type="text"
            placeholder="Search sections..."
            style={styles.searchInput}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={styles.dataGrid}>
          {filteredSections.map(section => (
            <div key={section.id} style={styles.dataCard}>
              <div style={styles.dataCardContent}>
                <h3 style={typography.textLgMedium}>{section.section_name}</h3>
                <p style={{...typography.textSmRegular, color: colors.textSecondary, marginTop: '8px'}}>
                  {section.section_description || 'No description'}
                </p>
                
                <div style={styles.dataCardMeta}>
                  <span style={styles.badge}>
                    {section.exams?.exam_name || 'Unknown Exam'}
                  </span>
                </div>
              </div>
              
              <div style={styles.dataCardActions}>
                <button 
                  style={styles.editButton}
                  onClick={() => handleEdit(section)}
                >
                  Edit
                </button>
                <button 
                  style={styles.deleteButton}
                  onClick={() => handleDelete(section.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTests = () => {
    // Add search/filter
    const filteredTests = tests;

    if (loading) return <div style={styles.loading}>Loading tests...</div>;
    if (error) return <div style={styles.error}>{error}</div>;
    if (!filteredTests?.length) {
      return (
        <div style={styles.emptyState}>
          <span style={styles.emptyStateIcon}>📝</span>
          <h3 style={typography.textLgMedium}>No tests found</h3>
          <p style={{...typography.textMdRegular, color: colors.textSecondary}}>
            Create tests for your students to practice
          </p>
          <button 
            style={styles.createButton}
            onClick={handleShowAddModal}
          >
            Create Test
          </button>
        </div>
      );
    }

    return (
      <div>
        <div style={styles.searchContainer}>
          <input 
            type="text"
            placeholder="Search tests..."
            style={styles.searchInput}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={styles.dataGrid}>
          {filteredTests.map(test => (
            <div key={test.id} style={styles.dataCard}>
              <div style={styles.dataCardContent}>
                <h3 style={typography.textLgMedium}>{test.test_name}</h3>
                <p style={{...typography.textSmRegular, color: colors.textSecondary, marginTop: '8px'}}>
                  {test.exam?.exam_name || 'Unknown Exam'}
                </p>
                
                <div style={styles.dataCardMeta}>
                  <span style={styles.badge}>
                    {test.type || 'Regular'}
                  </span>
                  <span style={styles.badgeSecondary}>
                    {test.difficulty || 'Mixed'} difficulty
                  </span>
                </div>
                
                <div style={{marginTop: '12px', display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{...typography.textSmRegular, color: colors.textSecondary}}>
                    {test.total_questions} questions
                  </span>
                  <span style={{...typography.textSmRegular, color: colors.textSecondary}}>
                    {test.duration} min
                  </span>
                </div>
              </div>
              
              <div style={styles.dataCardActions}>
                <button 
                  style={styles.editButton}
                  onClick={() => handleEdit(test)}
                >
                  Edit
                </button>
                <button 
                  style={styles.deleteButton}
                  onClick={() => handleDelete(test.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderQuestions = () => {
    // Apply search and filters
    const filteredQuestions = applyFilters(questions);
    
    if (loading) return <div style={styles.loading}>Loading questions...</div>;
    if (error) return <div style={styles.error}>{error}</div>;
    
    // Question-specific filter options
    const renderQuestionFilters = () => (
      <div style={styles.filtersContainer}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Question Type</label>
          <select
            style={styles.filterSelect}
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
          >
            <option value="all">All Types</option>
            <option value="MCQ">Multiple Choice</option>
            <option value="TrueFalse">True/False</option>
            <option value="FillBlank">Fill in the Blank</option>
            <option value="Essay">Essay/Long Answer</option>
          </select>
        </div>
        
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Difficulty</label>
          <select
            style={styles.filterSelect}
            value={filters.difficulty}
            onChange={(e) => setFilters({...filters, difficulty: e.target.value})}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        
        {exams?.length > 0 && (
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Exam</label>
            <select
              style={styles.filterSelect}
              value={filters.examId || 'all'}
              onChange={(e) => setFilters({...filters, examId: e.target.value})}
            >
              <option value="all">All Exams</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>{exam.exam_name}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* Clear filters button */}
        {(filters.type !== 'all' || filters.difficulty !== 'all' || filters.examId || searchTerm) && (
          <button 
            style={styles.clearFiltersButton}
            onClick={() => {
              setFilters({...filters, type: 'all', difficulty: 'all', examId: null});
              setSearchTerm('');
              document.querySelector('input[type="text"]').value = '';
            }}
          >
            Clear Filters
          </button>
        )}
      </div>
    );

    return (
      <div>
        <div style={styles.tableControls}>
          <div style={styles.searchContainer}>
            <input 
              type="text"
              placeholder="Search questions, topics, or answers..."
              style={styles.searchInput}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {renderQuestionFilters()}
        </div>
        
        {filteredQuestions.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyStateIcon}>❓</span>
            <h3 style={typography.textLgMedium}>
              {searchTerm || filters.type !== 'all' ? 'No matching questions found' : 'No questions found'}
            </h3>
            <p style={{...typography.textMdRegular, color: colors.textSecondary}}>
              {searchTerm || filters.type !== 'all' 
                ? 'Try adjusting your filters or search term' 
                : 'Add questions to start building your tests'}
            </p>
            <div style={styles.emptyStateActions}>
              <button 
                style={styles.createButton}
                onClick={handleShowAddModal}
              >
                Create Question
              </button>
              <button 
                style={{...styles.createButton, backgroundColor: '#f8f9fa', color: colors.textPrimary, border: `1px solid ${colors.backgroundSecondary}`}}
                onClick={handleShowUploadModal}
              >
                Upload Questions
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.questionsList}>
            <div style={styles.questionHeader}>
              <div style={{...styles.questionCell, flex: 2}}>Question</div>
              <div style={styles.questionCell}>Type</div>
              <div style={styles.questionCell}>Difficulty</div>
              <div style={styles.questionCell}>Exam / Section</div>
              <div style={{...styles.questionCell, flex: 0.5}}>Actions</div>
            </div>
            
            {filteredQuestions.map(question => (
              <div key={question.id}>
                <div 
                  style={styles.questionRow}
                  onClick={() => setExpandedQuestion(expandedQuestion === question.id ? null : question.id)}
                >
                  <div style={{...styles.questionCell, flex: 2}}>
                    <div style={styles.questionPreview}>
                      {question.question_text?.length > 80 
                        ? question.question_text.substring(0, 80) + '...' 
                        : question.question_text}
                    </div>
                  </div>
                  
                  <div style={styles.questionCell}>
                    <span style={{
                      ...styles.typeBadge,
                      backgroundColor: getTypeColor(question.question_type).bg,
                      color: getTypeColor(question.question_type).text
                    }}>
                      {question.question_type || 'MCQ'}
                    </span>
                  </div>
                  
                  <div style={styles.questionCell}>
                    <span style={{
                      ...styles.difficultyBadge, 
                      backgroundColor: getDifficultyColor(question.difficulty).bg,
                      color: getDifficultyColor(question.difficulty).text
                    }}>
                      {question.difficulty || 'mixed'}
                    </span>
                  </div>
                  
                  <div style={styles.questionCell}>
                    <div>
                      {question.exam?.exam_name || 'No exam'}
                      {question.section?.section_name && (
                        <span style={{color: colors.textSecondary, fontSize: '12px', display: 'block'}}>
                          {question.section.section_name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{...styles.questionCell, flex: 0.5}}>
                    <div style={styles.rowActions}>
                      <button 
                        style={styles.actionButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(question);
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        style={{...styles.actionButton, color: '#e63946'}}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(question.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Expanded view */}
                {expandedQuestion === question.id && (
                  <div style={styles.expandedQuestion}>
                    <div style={styles.expandedContent}>
                      <div style={styles.questionDetails}>
                        <h3 style={typography.textLgMedium}>Question</h3>
                        <p style={styles.questionText}>{question.question_text}</p>
                        
                        <h3 style={{...typography.textMdMedium, marginTop: '16px'}}>Answer Choices</h3>
                        <div style={styles.choices}>
                          {renderChoices(question.choices)}
                        </div>
                        
                        <h3 style={{...typography.textMdMedium, marginTop: '16px'}}>Correct Answer</h3>
                        <div style={styles.correctAnswer}>
                          {renderCorrectAnswer(question.correct_answer, question.choices)}
                        </div>
                        
                        {question.solution && (
                          <>
                            <h3 style={{...typography.textMdMedium, marginTop: '16px'}}>Solution</h3>
                            <p style={styles.solution}>{question.solution}</p>
                          </>
                        )}
                      </div>
                      
                      <div style={styles.questionMeta}>
                        <div style={styles.metaItem}>
                          <span style={styles.metaLabel}>Exam:</span>
                          <span style={styles.metaValue}>{question.exam?.exam_name || 'None'}</span>
                        </div>
                        
                        <div style={styles.metaItem}>
                          <span style={styles.metaLabel}>Section:</span>
                          <span style={styles.metaValue}>{question.section?.section_name || 'None'}</span>
                        </div>
                        
                        <div style={styles.metaItem}>
                          <span style={styles.metaLabel}>Type:</span>
                          <span style={styles.metaValue}>{question.question_type || 'MCQ'}</span>
                        </div>
                        
                        <div style={styles.metaItem}>
                          <span style={styles.metaLabel}>Difficulty:</span>
                          <span style={styles.metaValue}>{question.difficulty || 'mixed'}</span>
                        </div>
                        
                        <div style={styles.metaItem}>
                          <span style={styles.metaLabel}>Topic:</span>
                          <span style={styles.metaValue}>{question.topic || 'General'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderScoringModels = () => {
    if (loading) return <div style={styles.loading}>Loading scoring models...</div>;
    
    return (
      <div>
        <div style={styles.searchContainer}>
          <input 
            type="text"
            placeholder="Search scoring models..."
            style={styles.searchInput}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={styles.dataGrid}>
          {scoringModels.map(model => (
            <div key={model.id} style={styles.dataCard}>
              <div style={styles.dataCardContent}>
                <h3 style={typography.textLgMedium}>{model.model_name}</h3>
                
                <div style={styles.scoringDetails}>
                  <div>
                    <p style={styles.scoreLabel}>Correct</p>
                    <p style={{...styles.scoreDetail, color: colors.accentSuccess}}>
                      +{model.positive_marks}
                    </p>
                  </div>
                  
                  <div>
                    <p style={styles.scoreLabel}>Incorrect</p>
                    <p style={{...styles.scoreDetail, color: colors.accentError}}>
                      -{model.negative_marks}
                    </p>
                  </div>
                  
                  <div>
                    <p style={styles.scoreLabel}>Partial</p>
                    <p style={styles.scoreDetail}>
                      {model.partial_allowed ? 'Allowed' : 'Not allowed'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div style={styles.dataCardActions}>
                <button 
                  style={styles.editButton}
                  onClick={() => handleEdit(model)}
                >
                  Edit
                </button>
                <button 
                  style={styles.deleteButton}
                  onClick={() => handleDelete(model.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Add this function to handle confirmation dialog setup
  const confirmDialog = (action, id, title, message) => {
    setConfirmAction(action);
    setConfirmItemId(id);
    setConfirmTitle(title);
    setConfirmMessage(message);
    setShowConfirmDialog(true);
  };

  // Add function to handle dialog confirmation
  const handleConfirm = async () => {
    try {
      setError(null);
      
      if (confirmAction === 'delete') {
        // Existing delete logic, but without the window.confirm
        try {
          let error;

          switch (activeTab) {
            case 'exams':
              const { error: examError } = await supabase
                .from('exams')
                .delete()
                .eq('id', confirmItemId);
              error = examError;
              break;
            // Similar cases for other types
          }

          if (error) throw error;
          
          setSuccess(`Item deleted successfully`);
          fetchData();
        } catch (error) {
          setError(error.message);
        }
      }
      
      // Close the dialog when done
      setShowConfirmDialog(false);
    } catch (error) {
      setError(error.message);
    }
  };

  // Add this method to handle filtering
  const applyFilters = (data) => {
    if (!data) return [];
    
    return data.filter(item => {
      // Filter by search term if provided
      if (searchTerm && !JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by status if selected
      if (filters.status !== 'all') {
        if (filters.status === 'active' && !item.is_active) return false;
        if (filters.status === 'inactive' && item.is_active) return false;
      }
      
      // Filter by difficulty if selected
      if (filters.difficulty !== 'all' && item.difficulty !== filters.difficulty) {
        return false;
      }
      
      // Filter by type if selected
      if (filters.type !== 'all' && item.type !== filters.type) {
        return false;
      }
      
      return true;
    });
  };

  // Add this to render filter controls
  const renderFilters = () => {
    // Show different filters based on active tab
    const showStatusFilter = ['exams', 'tests'].includes(activeTab);
    const showDifficultyFilter = ['tests', 'questions'].includes(activeTab);
    const showTypeFilter = ['tests', 'questions'].includes(activeTab);
    
    if (!showStatusFilter && !showDifficultyFilter && !showTypeFilter) {
      return null;
    }
    
    return (
      <div style={styles.filtersContainer}>
        {showStatusFilter && (
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Status</label>
            <select
              style={styles.filterSelect}
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}
        
        {showDifficultyFilter && (
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Difficulty</label>
            <select
              style={styles.filterSelect}
              value={filters.difficulty}
              onChange={(e) => setFilters({...filters, difficulty: e.target.value})}
            >
              <option value="all">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        )}
        
        {showTypeFilter && (
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Type</label>
            <select
              style={styles.filterSelect}
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
            >
              <option value="all">All</option>
              <option value="regular">Regular</option>
              <option value="recommended">Recommended</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        )}
        
        {/* Show clear filters button if any filter is active */}
        {(filters.status !== 'all' || filters.difficulty !== 'all' || filters.type !== 'all' || searchTerm) && (
          <button 
            style={styles.clearFiltersButton}
            onClick={() => {
              setFilters({status: 'all', difficulty: 'all', type: 'all'});
              setSearchTerm('');
              document.querySelector('input[type="text"]').value = '';
            }}
          >
            Clear Filters
          </button>
        )}
      </div>
    );
  };

  // Add this to render the confirmation dialog
  const renderConfirmDialog = () => {
    if (!showConfirmDialog) return null;
    
    return (
      <div style={styles.modalBackdrop}>
        <div style={styles.modalContent}>
          <h3 style={typography.textLgBold}>{confirmTitle}</h3>
          <p style={{...typography.textMdRegular, margin: '16px 0'}}>{confirmMessage}</p>
          
          <div style={styles.modalActions}>
            <button 
              style={styles.cancelButton}
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </button>
            <button
              style={styles.confirmButton}
              onClick={handleConfirm}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add this function to render the add modal
  const renderAddModal = () => {
    if (!showAddModal) return null;
    
    let formContent;
    
    switch (activeTab) {
      case 'exams':
        formContent = (
          <>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Exam Name*</label>
              <input
                type="text"
                style={styles.formInput}
                value={newItemData.exam_name || ''}
                onChange={(e) => setNewItemData({...newItemData, exam_name: e.target.value})}
                placeholder="Enter exam name"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Description</label>
              <textarea
                style={{...styles.formInput, minHeight: '100px'}}
                value={newItemData.exam_description || ''}
                onChange={(e) => setNewItemData({...newItemData, exam_description: e.target.value})}
                placeholder="Enter exam description"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                <input
                  type="checkbox"
                  checked={newItemData.is_active ?? true}
                  onChange={(e) => setNewItemData({...newItemData, is_active: e.target.checked})}
                />
                {' '}Active
              </label>
            </div>
          </>
        );
        break;
        
      case 'sections':
        formContent = (
          <>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Exam*</label>
              <select
                style={styles.formInput}
                value={newItemData.exam_id || ''}
                onChange={(e) => setNewItemData({...newItemData, exam_id: e.target.value})}
              >
                <option value="">Select an exam</option>
                {exams.map(exam => (
                  <option key={exam.id} value={exam.id}>{exam.exam_name}</option>
                ))}
              </select>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Section Name*</label>
              <input
                type="text"
                style={styles.formInput}
                value={newItemData.section_name || ''}
                onChange={(e) => setNewItemData({...newItemData, section_name: e.target.value})}
                placeholder="Enter section name"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Description</label>
              <textarea
                style={{...styles.formInput, minHeight: '100px'}}
                value={newItemData.section_description || ''}
                onChange={(e) => setNewItemData({...newItemData, section_description: e.target.value})}
                placeholder="Enter section description"
              />
            </div>
          </>
        );
        break;
        
      case 'scoring':
        formContent = (
          <>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Model Name*</label>
              <input
                type="text"
                style={styles.formInput}
                value={newItemData.model_name || ''}
                onChange={(e) => setNewItemData({...newItemData, model_name: e.target.value})}
                placeholder="Enter model name"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Positive Marks</label>
              <input
                type="number"
                step="0.01"
                style={styles.formInput}
                value={newItemData.positive_marks || 1}
                onChange={(e) => setNewItemData({...newItemData, positive_marks: parseFloat(e.target.value)})}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Negative Marks</label>
              <input
                type="number"
                step="0.01"
                style={styles.formInput}
                value={newItemData.negative_marks || 0}
                onChange={(e) => setNewItemData({...newItemData, negative_marks: parseFloat(e.target.value)})}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                <input
                  type="checkbox"
                  checked={newItemData.partial_allowed || false}
                  onChange={(e) => setNewItemData({...newItemData, partial_allowed: e.target.checked})}
                />
                {' '}Allow Partial Marking
              </label>
            </div>
          </>
        );
        break;
        
      default:
        formContent = <p>Select a different tab to add content</p>;
    }
    
    return (
      <div style={styles.modalBackdrop}>
        <div style={styles.modalContent}>
          <h3 style={typography.textLgBold}>Add New {activeTab.slice(0, -1)}</h3>
          
          <div style={styles.formContainer}>
            {formContent}
          </div>
          
          <div style={styles.modalActions}>
            <button 
              style={styles.cancelButton}
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </button>
            <button
              style={styles.confirmButton}
              onClick={handleAddItem}
            >
              Add {activeTab.slice(0, -1)}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Update the header in your render function to use the new modal
  const renderHeader = () => (
    <div style={styles.header}>
      <h2 style={typography.displaySmBold}>
        {activeTab === 'dashboard' ? 'Admin Dashboard' : `Manage ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
      </h2>
      
      <div style={styles.headerActions}>
        {activeTab !== 'dashboard' && (
          <button 
            style={styles.addButton}
            onClick={handleShowAddModal}
          >
            <span style={{fontSize: '18px'}}>+</span> Add New
          </button>
        )}
        
        {['questions', 'tests', 'exams'].includes(activeTab) && (
          <button 
            style={styles.uploadButton}
            onClick={handleShowUploadModal}
          >
            <span style={{fontSize: '18px'}}>📤</span> Upload
          </button>
        )}
      </div>
    </div>
  );

  // Helper functions for the question section
  const getTypeColor = (type) => {
    switch(type) {
      case 'MCQ':
        return { bg: '#e3f2fd', text: '#0d47a1' }; // Light blue
      case 'TrueFalse':
        return { bg: '#e8f5e9', text: '#1b5e20' }; // Light green
      case 'FillBlank':
        return { bg: '#fff3e0', text: '#e65100' }; // Light orange
      case 'Essay':
        return { bg: '#f3e5f5', text: '#4a148c' }; // Light purple
      default:
        return { bg: '#f5f5f5', text: '#616161' }; // Light gray
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'easy':
        return { bg: '#e8f5e9', text: '#1b5e20' }; // Light green
      case 'medium':
        return { bg: '#fff3e0', text: '#e65100' }; // Light orange
      case 'hard':
        return { bg: '#ffebee', text: '#b71c1c' }; // Light red
      default:
        return { bg: '#f5f5f5', text: '#616161' }; // Light gray
    }
  };

  const renderChoices = (choices) => {
    if (!choices) return <p>No choices available</p>;
    
    let choicesObj;
    try {
      choicesObj = typeof choices === 'string' ? JSON.parse(choices) : choices;
    } catch (e) {
      return <p>Invalid choice format</p>;
    }
    
    return (
      <div style={styles.choicesList}>
        {Object.entries(choicesObj).map(([key, value]) => (
          <div key={key} style={styles.choiceItem}>
            <span style={styles.choiceKey}>{key}</span>
            <span style={styles.choiceValue}>{value}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderCorrectAnswer = (correctAnswer, choices) => {
    if (!correctAnswer) return <p>No correct answer specified</p>;
    
    let answerObj;
    try {
      answerObj = typeof correctAnswer === 'string' ? JSON.parse(correctAnswer) : correctAnswer;
    } catch (e) {
      return <p>Invalid answer format</p>;
    }
    
    if (answerObj.answer) {
      // For single answer questions
      return <div style={styles.correctAnswerText}>{answerObj.answer}</div>;
    } else if (Array.isArray(answerObj)) {
      // For multiple answer questions
      return (
        <div style={styles.multipleAnswers}>
          {answerObj.map((ans, i) => (
            <div key={i} style={styles.correctAnswerText}>{ans}</div>
          ))}
        </div>
      );
    }
    
    return <p>Unrecognized answer format</p>;
  };

  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          Checking admin access...
          {error && <div style={styles.error}>{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h1 style={typography.textXlBold}>EDTEC Admin</h1>
        </div>
        
        <div style={styles.sidebarMenu}>
          <button 
            style={{
              ...styles.sidebarMenuItem,
              ...(activeTab === 'dashboard' && styles.activeMenuItem)
            }}
            onClick={() => setActiveTab('dashboard')}
          >
            <span style={styles.menuIcon}>📊</span>
            Dashboard
          </button>
          
          <button 
            style={{
              ...styles.sidebarMenuItem,
              ...(activeTab === 'exams' && styles.activeMenuItem)
            }}
            onClick={() => setActiveTab('exams')}
          >
            <span style={styles.menuIcon}>📚</span>
            Exams
          </button>
          
          <button 
            style={{
              ...styles.sidebarMenuItem,
              ...(activeTab === 'sections' && styles.activeMenuItem)
            }}
            onClick={() => setActiveTab('sections')}
          >
            <span style={styles.menuIcon}>📑</span>
            Sections
          </button>
          
          <button 
            style={{
              ...styles.sidebarMenuItem,
              ...(activeTab === 'tests' && styles.activeMenuItem)
            }}
            onClick={() => setActiveTab('tests')}
          >
            <span style={styles.menuIcon}>📝</span>
            Tests
          </button>
          
          <button 
            style={{
              ...styles.sidebarMenuItem,
              ...(activeTab === 'questions' && styles.activeMenuItem)
            }}
            onClick={() => setActiveTab('questions')}
          >
            <span style={styles.menuIcon}>❓</span>
            Questions
          </button>
          
          <button 
            style={{
              ...styles.sidebarMenuItem,
              ...(activeTab === 'scoring' && styles.activeMenuItem)
            }}
            onClick={() => setActiveTab('scoring')}
          >
            <span style={styles.menuIcon}>🎯</span>
            Scoring Models
          </button>
        </div>
        
        <div style={styles.sidebarFooter}>
          <button 
            style={styles.backButton}
            onClick={() => navigate('/')}
          >
            <span style={styles.menuIcon}>🏠</span>
            Back to App
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={styles.mainContent}>
        {renderHeader()}
        
        {/* Notifications */}
        {(error || success) && (
          <div 
            style={{
              ...styles.notification,
              backgroundColor: error ? `${colors.accentError}15` : `${colors.accentSuccess}15`,
              borderColor: error ? colors.accentError : colors.accentSuccess
            }}
          >
            <span style={styles.notificationIcon}>
              {error ? '❌' : '✅'}
            </span>
            <span style={typography.textMdRegular}>
              {error || success}
            </span>
            <button 
              style={styles.closeButton}
              onClick={() => {
                if (error) setError(null);
                if (success) setSuccess(null);
              }}
            >
              ✕
            </button>
          </div>
        )}
        
        {/* Content */}
        <div style={styles.content}>
          {renderContent()}
        </div>
      </div>
      
      {/* Modals */}
      {renderConfirmDialog()}
      {renderAddModal()}
      {showUploadModal && (
        <FileUploadModal
          isOpen={showUploadModal}
          onClose={handleCloseUploadModal}
          onUpload={handleUpload}
          type={activeTab}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f9fafc',
  },
  sidebar: {
    width: '280px',
    backgroundColor: colors.backgroundPrimary,
    borderRight: `1px solid ${colors.backgroundSecondary}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
    boxShadow: '0 0 10px rgba(0,0,0,0.05)',
  },
  sidebarHeader: {
    padding: '0 24px 24px',
    borderBottom: `1px solid ${colors.backgroundSecondary}`,
  },
  sidebarMenu: {
    flex: 1,
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sidebarMenuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    color: colors.textPrimary,
    cursor: 'pointer',
    transition: 'all 0.2s',
    ...typography.textMdMedium,
    textAlign: 'left',
  },
  activeMenuItem: {
    backgroundColor: colors.backgroundSecondary,
    color: colors.brandPrimary,
  },
  menuIcon: {
    marginRight: '12px',
    fontSize: '18px',
  },
  sidebarFooter: {
    padding: '16px',
    borderTop: `1px solid ${colors.backgroundSecondary}`,
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    border: `1px solid ${colors.backgroundSecondary}`,
    color: colors.textPrimary,
    cursor: 'pointer',
    ...typography.textMdMedium,
    transition: 'all 0.2s',
  },
  mainContent: {
    flex: 1,
    padding: '24px 32px',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  headerActions: {
    display: 'flex',
    gap: '16px',
  },
  addButton: {
    backgroundColor: '#3b47c3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    cursor: 'pointer',
    ...typography.textMdBold,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#2c3698',
    }
  },
  uploadButton: {
    backgroundColor: 'transparent',
    color: colors.brandPrimary,
    border: `1px solid ${colors.brandPrimary}`,
    borderRadius: '8px',
    padding: '10px 16px',
    cursor: 'pointer',
    ...typography.textMdBold,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  notification: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid',
    position: 'relative',
  },
  notificationIcon: {
    marginRight: '12px',
    fontSize: '18px',
  },
  closeButton: {
    position: 'absolute',
    right: '12px',
    top: '12px',
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: colors.textSecondary,
  },
  content: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '24px',
  },
  statsCard: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: `1px solid ${colors.backgroundSecondary}`,
  },
  statIcon: {
    fontSize: '32px',
    width: '64px',
    height: '64px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  quickActionsCard: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '12px',
    padding: '24px',
    gridColumn: 'span 2',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: `1px solid ${colors.backgroundSecondary}`,
  },
  quickActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '16px',
  },
  quickActionButton: {
    flex: '1 0 calc(33% - 12px)',
    minWidth: '120px',
    backgroundColor: '#f8f9fa',
    border: `1px solid ${colors.backgroundSecondary}`,
    borderRadius: '8px',
    padding: '16px 12px',
    cursor: 'pointer',
    ...typography.textSmMedium,
    color: colors.textPrimary,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: colors.backgroundSecondary,
      transform: 'translateY(-2px)',
    }
  },
  actionIcon: {
    fontSize: '24px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 0',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: `3px solid ${colors.backgroundSecondary}`,
    borderTop: `3px solid ${colors.brandPrimary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: '24px',
    maxWidth: '400px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.backgroundSecondary}`,
    backgroundColor: colors.backgroundPrimary,
    ...typography.textMdRegular,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 0',
    gap: '16px',
    textAlign: 'center',
  },
  emptyStateIcon: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  createButton: {
    padding: '10px 24px',
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
    borderRadius: '8px',
    ...typography.textMdBold,
    cursor: 'pointer',
    marginTop: '16px',
  },
  dataGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  dataList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  dataCard: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '12px',
    border: `1px solid ${colors.backgroundSecondary}`,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }
  },
  dataCardContent: {
    padding: '20px',
  },
  dataCardMeta: {
    marginTop: '8px',
  },
  dataCardActions: {
    display: 'flex',
    borderTop: `1px solid ${colors.backgroundSecondary}`,
    padding: '12px 20px',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  editButton: {
    backgroundColor: '#3b47c3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    ...typography.textSmMedium,
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#2c3698',
    }
  },
  deleteButton: {
    backgroundColor: '#e63946',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    ...typography.textSmMedium,
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#c1121f',
    }
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '8px',
    backgroundColor: '#e0f5e9',
    color: '#0a6e31',
    ...typography.textSmMedium,
    display: 'inline-block',
    marginRight: '8px',
  },
  badgeSecondary: {
    padding: '4px 8px',
    borderRadius: '8px',
    backgroundColor: '#fff3cd',
    color: '#856404',
    ...typography.textSmMedium,
    display: 'inline-block',
    marginRight: '8px',
  },
  scoreLabel: {
    ...typography.textSmMedium,
  },
  scoreDetail: {
    ...typography.textMdRegular,
  },
  scoringDetails: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  tableControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },
  filtersContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'flex-end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  filterLabel: {
    ...typography.textSmMedium,
    color: colors.textSecondary,
  },
  filterSelect: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: `1px solid ${colors.backgroundSecondary}`,
    backgroundColor: colors.backgroundPrimary,
    minWidth: '120px',
  },
  clearFiltersButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    border: `1px solid ${colors.backgroundSecondary}`,
    borderRadius: '8px',
    cursor: 'pointer',
    ...typography.textSmMedium,
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '12px',
    padding: '24px',
    minWidth: '400px',
    maxWidth: '600px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    ...typography.textSmMedium,
  },
  confirmButton: {
    padding: '8px 16px',
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    ...typography.textSmMedium,
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHead: {
    backgroundColor: colors.backgroundSecondary,
  },
  tableHeaderCell: {
    padding: '12px 16px',
    textAlign: 'left',
    ...typography.textSmMedium,
    color: colors.textSecondary,
  },
  tableCell: {
    padding: '12px 16px',
    borderBottom: `1px solid ${colors.backgroundSecondary}`,
  },
  tableRow: {
    ':hover': {
      backgroundColor: `${colors.backgroundSecondary}50`,
    }
  },
  formContainer: {
    marginTop: '20px',
    maxHeight: '60vh',
    overflowY: 'auto',
    padding: '0 4px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  formLabel: {
    display: 'block',
    marginBottom: '8px',
    ...typography.textSmMedium,
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${colors.backgroundSecondary}`,
    backgroundColor: colors.backgroundPrimary,
    ...typography.textMdRegular,
  },
  questionsList: {
    border: `1px solid ${colors.backgroundSecondary}`,
    borderRadius: '8px',
    overflow: 'hidden',
  },
  questionHeader: {
    display: 'flex',
    backgroundColor: colors.backgroundSecondary,
    padding: '12px 16px',
    ...typography.textSmBold,
    color: colors.textSecondary,
  },
  questionRow: {
    display: 'flex',
    padding: '16px',
    borderBottom: `1px solid ${colors.backgroundSecondary}`,
    cursor: 'pointer',
    backgroundColor: colors.backgroundPrimary,
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#f9f9f9',
    }
  },
  questionCell: {
    flex: 1,
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
  },
  questionPreview: {
    ...typography.textMdRegular,
    color: colors.textPrimary,
  },
  typeBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    display: 'inline-block',
  },
  difficultyBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    display: 'inline-block',
  },
  rowActions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    ...typography.textSmMedium,
    color: colors.brandPrimary,
    padding: '4px 8px',
  },
  expandedQuestion: {
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderBottom: `1px solid ${colors.backgroundSecondary}`,
  },
  expandedContent: {
    display: 'flex',
    gap: '24px',
  },
  questionDetails: {
    flex: 3,
    backgroundColor: colors.backgroundPrimary,
    padding: '16px',
    borderRadius: '8px',
    border: `1px solid ${colors.backgroundSecondary}`,
  },
  questionText: {
    ...typography.textMdRegular,
    marginTop: '8px',
    lineHeight: 1.5,
  },
  choices: {
    marginTop: '8px',
  },
  choicesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  correctAnswer: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#e8f5e9',
    borderRadius: '4px',
    border: '1px solid #c8e6c9',
  },
  correctAnswerText: {
    ...typography.textMdMedium,
    color: '#2e7d32',
  },
  multipleAnswers: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  solution: {
    ...typography.textMdRegular,
    marginTop: '8px',
    lineHeight: 1.5,
    padding: '12px',
    backgroundColor: '#fff8e1',
    borderRadius: '4px',
    border: '1px solid #ffecb3',
  },
  questionMeta: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: colors.backgroundPrimary,
    padding: '16px',
    borderRadius: '8px',
    border: `1px solid ${colors.backgroundSecondary}`,
    height: 'fit-content',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metaLabel: {
    ...typography.textXsRegular,
    color: colors.textSecondary,
  },
  metaValue: {
    ...typography.textSmMedium,
  },
  emptyStateActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  adminCard: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
    }
  },
  adminCardIcon: {
    fontSize: '32px',
    width: '64px',
    height: '64px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminCardContent: {
    flex: 1,
  },
};

export default AdminConsole; 