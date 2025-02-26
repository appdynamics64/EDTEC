import React, { useState, useEffect } from 'react';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import { supabase } from '../config/supabaseClient';

const FileUploadModal = ({ isOpen, onClose, onUpload, type }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [jsonInput, setJsonInput] = useState('');
  const [uploadMethod, setUploadMethod] = useState('file');
  const [exams, setExams] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setError(null);
      setStep(1);
    }
  }, [isOpen, type]);

  useEffect(() => {
    if (isOpen) {
      fetchExams();
    }
  }, [isOpen]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('id, exam_name');
      
      if (examError) throw examError;
      setExams(examData || []);
    } catch (error) {
      setError('Error fetching exams: ' + error.message);
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async (examId) => {
    try {
      setLoading(true);
      setError(null);
      const { data: sectionData, error: sectionError } = await supabase
        .from('exam_sections')
        .select('id, section_name')
        .eq('exam_id', examId);
      
      if (sectionError) throw sectionError;
      setSections(sectionData || []);
    } catch (error) {
      setError('Error fetching sections: ' + error.message);
      console.error('Error fetching sections:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const testTemplate = {
    test_name: "Test Name",
    total_questions: 50,
    duration: 60,
    is_active: true
  };

  const questionTemplate = {
    question_text: "What is...?",
    question_type: "MCQ",
    choices: {
      "A": "First choice",
      "B": "Second choice",
      "C": "Third choice",
      "D": "Fourth choice"
    },
    correct_answer: "A",
    difficulty: "Medium",
    is_active: true
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile);
      setError(null);
      setStep(2);
    } else {
      setError('Please select a JSON file');
    }
  };

  const handleJsonPaste = () => {
    try {
      let jsonData = JSON.parse(jsonInput);
      
      if (!Array.isArray(jsonData)) {
        jsonData = [jsonData];
      }

      if (type === 'questions') {
        if (!selectedExam) {
          setError('Please select an exam');
          return;
        }
        if (!selectedSection) {
          setError('Please select a section');
          return;
        }

        jsonData = jsonData.map(question => ({
          ...question,
          exam_id: selectedExam,
          section_id: selectedSection
        }));
      } else if (type === 'tests') {
        if (!selectedExam) {
          setError('Please select an exam');
          return;
        }

        jsonData = jsonData.map(test => ({
          ...test,
          exam_id: selectedExam
        }));
      }

      onUpload(jsonData);
      handleClose();
    } catch (error) {
      setError('Invalid JSON format. Please check your input.');
    }
  };

  const handleUpload = async () => {
    try {
      const fileContent = await file.text();
      let jsonData = JSON.parse(fileContent);
      
      if (!Array.isArray(jsonData)) {
        jsonData = [jsonData];
      }

      if (type === 'questions') {
        if (!selectedExam) {
          setError('Please select an exam');
          return;
        }
        if (!selectedSection) {
          setError('Please select a section');
          return;
        }

        jsonData = jsonData.map(question => ({
          ...question,
          exam_id: selectedExam,
          section_id: selectedSection
        }));
      } else if (type === 'tests') {
        if (!selectedExam) {
          setError('Please select an exam');
          return;
        }

        jsonData = jsonData.map(test => ({
          ...test,
          exam_id: selectedExam
        }));
      }

      onUpload(jsonData);
      onClose();
    } catch (error) {
      setError('Invalid JSON format');
    }
  };

  const downloadTemplate = () => {
    const template = type === 'tests' ? [testTemplate] : [questionTemplate];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setStep(1);
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={typography.textLgBold}>Upload {type}</h2>
          <button onClick={handleClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>Loading...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : (
            /* Step indicators */
            <div style={styles.steps}>
              <div style={{
                ...styles.step,
                ...(step >= 1 && styles.activeStep)
              }}>1. Get Template</div>
              <div style={styles.stepLine} />
              <div style={{
                ...styles.step,
                ...(step >= 2 && styles.activeStep)
              }}>2. Upload File</div>
              <div style={styles.stepLine} />
              <div style={{
                ...styles.step,
                ...(step === 3 && styles.activeStep)
              }}>3. Confirm</div>
            </div>
          )}

          {step === 1 && (
            <div style={styles.section}>
              <h3 style={typography.textMdBold}>Step 1: Download Template</h3>
              <p style={typography.textSmRegular}>
                Download the template JSON file and fill in your {type} data.
                Make sure to follow the format exactly.
              </p>
              <div style={styles.templateExample}>
                <pre style={styles.pre}>
                  {JSON.stringify(type === 'tests' ? testTemplate : questionTemplate, null, 2)}
                </pre>
              </div>
              <button 
                onClick={downloadTemplate}
                style={styles.button}
              >
                Download Template
              </button>
              <button 
                onClick={() => setStep(2)}
                style={styles.button}
              >
                I have my file ready →
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={styles.section}>
              <h3 style={typography.textMdBold}>Step 2: Upload Your Data</h3>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Select Exam</label>
                <select 
                  value={selectedExam}
                  onChange={(e) => {
                    setSelectedExam(e.target.value);
                    if (type === 'questions') {
                      fetchSections(e.target.value);
                    }
                  }}
                  style={styles.select}
                >
                  <option value="">Select an exam...</option>
                  {exams.map(exam => (
                    <option key={exam.id} value={exam.id}>
                      {exam.exam_name}
                    </option>
                  ))}
                </select>
              </div>

              {type === 'questions' && selectedExam && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Select Section</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Select a section...</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>
                        {section.section_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={styles.methodSelector}>
                <button 
                  onClick={() => setUploadMethod('file')}
                  style={{
                    ...styles.methodButton,
                    ...(uploadMethod === 'file' && styles.activeMethodButton)
                  }}
                >
                  Upload File
                </button>
                <button 
                  onClick={() => setUploadMethod('paste')}
                  style={{
                    ...styles.methodButton,
                    ...(uploadMethod === 'paste' && styles.activeMethodButton)
                  }}
                >
                  Paste JSON
                </button>
              </div>

              {uploadMethod === 'file' ? (
                <>
                  <p style={typography.textSmRegular}>
                    Select your JSON file containing the {type} data.
                    Make sure it follows the template format.
                  </p>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleFileChange}
                    style={styles.fileInput}
                  />
                  {file && (
                    <button 
                      onClick={() => setStep(3)}
                      style={styles.button}
                    >
                      Review Upload →
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p style={typography.textSmRegular}>
                    Paste your JSON data below.
                    Make sure it follows the template format.
                  </p>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder={JSON.stringify(
                      type === 'tests' ? [testTemplate] : [questionTemplate],
                      null,
                      2
                    )}
                    style={styles.jsonInput}
                    rows={10}
                  />
                  {jsonInput && (
                    <button 
                      onClick={() => {
                        try {
                          JSON.parse(jsonInput);
                          setStep(3);
                        } catch (e) {
                          setError('Invalid JSON format. Please check your input.');
                        }
                      }}
                      style={styles.button}
                    >
                      Review Upload →
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={styles.section}>
              <h3 style={typography.textMdBold}>Step 3: Confirm Upload</h3>
              <p style={typography.textSmRegular}>
                You're about to upload {uploadMethod === 'file' ? file?.name : 'pasted'} data.
                This will add new {type} to the database.
              </p>
              <div style={styles.buttonGroup}>
                <button 
                  onClick={uploadMethod === 'file' ? handleUpload : handleJsonPaste}
                  style={styles.button}
                >
                  Confirm Upload
                </button>
                <button 
                  onClick={handleClose}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: colors.textSecondary,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  steps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '32px',
  },
  step: {
    padding: '8px 16px',
    borderRadius: '20px',
    backgroundColor: colors.backgroundSecondary,
    color: colors.textSecondary,
    ...typography.textSmMedium,
  },
  activeStep: {
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
  },
  stepLine: {
    flex: 1,
    height: '2px',
    backgroundColor: colors.backgroundSecondary,
    margin: '0 8px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  templateExample: {
    backgroundColor: colors.backgroundSecondary,
    padding: '16px',
    borderRadius: '8px',
    overflow: 'auto',
  },
  pre: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    ...typography.textSmRegular,
  },
  button: {
    padding: '12px 24px',
    borderRadius: '8px',
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
    cursor: 'pointer',
    ...typography.textSmMedium,
  },
  cancelButton: {
    padding: '12px 24px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: colors.textPrimary,
    border: `1px solid ${colors.textSecondary}`,
    cursor: 'pointer',
    ...typography.textSmMedium,
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
  },
  fileInput: {
    padding: '12px',
    border: `1px dashed ${colors.textSecondary}`,
    borderRadius: '8px',
    cursor: 'pointer',
  },
  error: {
    color: colors.accentError,
    ...typography.textSmRegular,
  },
  methodSelector: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  methodButton: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: `1px solid ${colors.brandPrimary}`,
    backgroundColor: 'transparent',
    color: colors.brandPrimary,
    cursor: 'pointer',
    ...typography.textSmMedium,
  },
  activeMethodButton: {
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
  },
  jsonInput: {
    width: '100%',
    minHeight: '200px',
    padding: '12px',
    borderRadius: '8px',
    border: `1px solid ${colors.textSecondary}`,
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: '14px',
    resize: 'vertical',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  label: {
    ...typography.textSmMedium,
    color: colors.textPrimary,
  },
  select: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: `1px solid ${colors.textSecondary}`,
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
    cursor: 'pointer',
    ...typography.textSmRegular,
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: colors.textSecondary,
    ...typography.textMdRegular,
  },
};

export default FileUploadModal; 