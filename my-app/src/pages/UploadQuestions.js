import React, { useState } from 'react';
import { FaArrowLeft, FaUpload, FaFileCsv, FaFilePdf, FaHome, FaUsers, FaClipboardList, FaQuestion, FaBook, FaRobot, FaGraduationCap, FaCalculator } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
import styled from 'styled-components';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const UploadQuestions = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('csv');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Determine file type and switch to appropriate tab
    if (selectedFile.name.endsWith('.csv')) {
      setFileType('csv');
      setActiveTab('csv');
    } else if (selectedFile.name.endsWith('.pdf')) {
      setFileType('pdf');
      setActiveTab('pdf');
    } else {
      setFileType(null);
    }
    
    setError(null);
    setSuccess(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    if (!fileType) {
      setError("Only CSV and PDF files are supported");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setProgress(0);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_type', fileType);

      console.log("Uploading file:", file.name, "of type:", fileType);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to upload file: ${response.status}`);
      }

      const data = await response.json();
      console.log("Upload response:", data);
      
      setSuccess(`Successfully uploaded ${data.uploaded_count || 0} questions!`);
      setFile(null);
      setFileType(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error("Upload error:", error);
      setError(error.message || "An error occurred during upload");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get file icon
  const getFileIcon = () => {
    if (!file) return null;
    
    if (fileType === 'csv') {
      return <FaFileCsv style={{ marginRight: '8px' }} />;
    } else if (fileType === 'pdf') {
      return <FaFilePdf style={{ marginRight: '8px' }} />;
    }
    
    return null;
  };

  return (
    <Container>
      <Sidebar>
        <SidebarHeader>
          <h1>Admin</h1>
        </SidebarHeader>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaClipboardList /> Dashboard
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaUsers /> Users
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaGraduationCap /> Exams
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaClipboardList /> Tests
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaQuestion /> Questions
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaBook /> Subjects
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaBook /> Topics
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaCalculator /> Scoring Rules
        </NavItem>
        
        <NavItem onClick={() => navigate('/admin')}>
          <FaRobot /> AI Ingestion Tool
        </NavItem>
        
        <NavItem onClick={() => navigate('/explain-question')}>
          <FaQuestion /> AI Explanation Tool
        </NavItem>
        
        <NavItem active onClick={() => navigate('/upload-questions')}>
          <FaUpload /> Upload Questions
        </NavItem>
        
        <BackButton onClick={() => navigate('/dashboard')}>
          <FaArrowLeft /> Back to Dashboard
        </BackButton>
      </Sidebar>
      
      <Content>
        <Header>
          <h1>Question Upload Tool</h1>
        </Header>
        
        <ContentArea>
          <FormContainer>
            <h2>Upload Questions</h2>
            <Description>
              Upload either a CSV file with formatted questions or a PDF containing exam questions.
              The system will process the file and add the questions to your database.
            </Description>
            
            <UploadContainer>
              <FileInputWrapper>
                <FileInput
                  id="file-upload"
                  type="file"
                  accept=".csv,.pdf"
                  onChange={handleFileChange}
                />
                <FileInputLabel htmlFor="file-upload">
                  {file ? getFileIcon() : <><FaFileCsv style={{ marginRight: '4px' }} /> <FaFilePdf style={{ marginRight: '8px' }} /></>}
                  {file ? file.name : 'Choose CSV or PDF File'}
                </FileInputLabel>
              </FileInputWrapper>
              
              <UploadButton 
                onClick={handleUpload} 
                disabled={loading || !file}
              >
                {loading ? (
                  <>Uploading...</>
                ) : (
                  <><FaUpload style={{ marginRight: '8px' }} /> Upload File</>
                )}
              </UploadButton>
            </UploadContainer>
            
            {loading && (
              <ProgressContainer>
                <div>Processing file... Please wait.</div>
                <ProgressBar>
                  <ProgressFill style={{ width: `${progress}%` }} />
                </ProgressBar>
              </ProgressContainer>
            )}
            
            {error && (
              <ErrorContainer>
                <p style={{ margin: 0 }}>{error}</p>
              </ErrorContainer>
            )}
            
            {success && (
              <SuccessContainer>
                <p style={{ margin: 0 }}>{success}</p>
              </SuccessContainer>
            )}
            
            <TabContainer>
              <Tabs>
                <Tab 
                  active={activeTab === 'csv'}
                  onClick={() => setActiveTab('csv')}
                >
                  CSV Format
                </Tab>
                <Tab 
                  active={activeTab === 'pdf'}
                  onClick={() => setActiveTab('pdf')}
                >
                  PDF Format
                </Tab>
              </Tabs>
              
              {activeTab === 'csv' && (
                <InstructionsContainer>
                  <h3>CSV Format Instructions</h3>
                  <p>Your CSV file should have the following columns:</p>
                  <ul>
                    <li><strong>question_text</strong> - The question content</li>
                    <li><strong>options</strong> - Comma-separated list of options</li>
                    <li><strong>correct_answer</strong> - Index of the correct option (0-based)</li>
                    <li><strong>difficulty</strong> - Easy, Medium, or Hard</li>
                    <li><strong>topic_id</strong> - ID of the topic</li>
                    <li><strong>bloom_level</strong> - Knowledge, Comprehension, Application, etc.</li>
                    <li><strong>skill_tags</strong> - Comma-separated list of skills tested</li>
                  </ul>
                  
                  <h4>Example Format:</h4>
                  <CodeBlock>
{`question_text,options,correct_answer,difficulty,topic_id,bloom_level,skill_tags
"What is 2+2?","2,3,4,5",2,Easy,1,Knowledge,arithmetic,addition
"Who wrote Hamlet?","Shakespeare,Dickens,Austen,Tolstoy",0,Medium,2,Knowledge,literature,classics`}
                  </CodeBlock>
                </InstructionsContainer>
              )}
              
              {activeTab === 'pdf' && (
                <InstructionsContainer>
                  <h3>PDF Format Instructions</h3>
                  <p>Upload any PDF that contains exam questions. Our AI will:</p>
                  <ul>
                    <li>Extract all questions and answer options from the PDF</li>
                    <li>Identify the correct answers when provided</li>
                    <li>Categorize questions by topic and difficulty</li>
                    <li>Generate skill tags and metadata automatically</li>
                  </ul>
                  
                  <NoteBox>
                    <h4>Important Notes:</h4>
                    <ul>
                      <li>PDF extraction works best with clearly formatted documents</li>
                      <li>Questions should be clearly demarcated in the PDF</li>
                      <li>Each question should have numbered or lettered options</li>
                      <li>The system will attempt to identify which topics the questions belong to</li>
                    </ul>
                  </NoteBox>
                </InstructionsContainer>
              )}
            </TabContainer>
          </FormContainer>
        </ContentArea>
      </Content>
    </Container>
  );
};

// Styled components
const Container = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: #f8f9fa;
`;

const Sidebar = styled.div`
  width: 250px;
  background-color: ${colors.brandPrimary};
  color: white;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 0 20px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
  
  h1 {
    ${typography.textXlBold};
    margin: 0;
  }
`;

const NavItem = styled.div`
  padding: 15px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  ${typography.textMdMedium};
  background-color: ${props => props.active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  svg {
    font-size: 18px;
  }
`;

const BackButton = styled.div`
  margin-top: auto;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  ${typography.textMdMedium};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  padding: 20px;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  
  h1 {
    ${typography.textXlBold};
    margin: 0;
    color: ${colors.textPrimary};
  }
`;

const ContentArea = styled.div`
  padding: 20px;
  flex: 1;
`;

const FormContainer = styled.div`
  background-color: #ffffff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  h2 {
    margin-top: 0;
    color: ${colors.textPrimary};
  }
`;

const Description = styled.p`
  color: #666;
  margin-bottom: 20px;
`;

const UploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
`;

const FileInputWrapper = styled.div`
  width: 100%;
`;

const FileInput = styled.input`
  display: none;
`;

const FileInputLabel = styled.label`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background-color: #f3f4f6;
  color: #374151;
  border-radius: 4px;
  border: 1px dashed #d1d5db;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #e5e7eb;
  }
`;

const UploadButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  background-color: ${props => props.disabled ? '#9ca3af' : colors.brandPrimary};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.disabled ? '#9ca3af' : colors.brandPrimaryDark};
  }
`;

const ProgressContainer = styled.div`
  margin-bottom: 20px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
`;

const ProgressFill = styled.div`
  height: 100%;
  background-color: ${colors.brandPrimary};
  transition: width 0.3s ease;
`;

const ErrorContainer = styled.div`
  background-color: #fee2e2;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  color: #b91c1c;
`;

const SuccessContainer = styled.div`
  background-color: #d1fae5;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  color: #065f46;
`;

const TabContainer = styled.div`
  margin-top: 24px;
`;

const Tabs = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
`;

const Tab = styled.div`
  padding: 8px 16px;
  cursor: pointer;
  color: ${props => props.active ? colors.brandPrimary : '#6b7280'};
  border-bottom: ${props => props.active ? `2px solid ${colors.brandPrimary}` : 'none'};
  font-weight: ${props => props.active ? 'bold' : 'normal'};
`;

const InstructionsContainer = styled.div`
  background-color: #f3f4f6;
  padding: 16px;
  border-radius: 4px;
`;

const CodeBlock = styled.pre`
  background-color: #e5e7eb;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 14px;
  font-family: monospace;
  white-space: pre-wrap;
`;

const NoteBox = styled.div`
  background-color: #fff7ed;
  border: 1px solid #fbbf24;
  border-radius: 4px;
  padding: 12px;
  margin-top: 16px;
`;

export default UploadQuestions; 