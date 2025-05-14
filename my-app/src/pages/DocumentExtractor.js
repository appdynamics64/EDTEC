import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { FaCloudUploadAlt, FaFileAlt, FaSpinner, FaFileDownload, FaExclamationTriangle } from 'react-icons/fa';
import SidebarLayout from '../components/layout/SidebarLayout';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const DocumentExtractor = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const fileInputRef = React.useRef();

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };
  
  const validateAndSetFile = (file) => {
    setError(null);
    
    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or image file (JPEG, PNG)');
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }
    
    setFile(file);
  };
  
  const handleExtract = async () => {
    if (!file) return;
    
    setLoading(true);
    setProgress(0);
    setError(null);
    setResult(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post('/api/extract', formData, {
        responseType: 'blob',
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });
      
      // Create download URL
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setResult({
        url,
        filename: `${file.name.split('.')[0]}_extracted.zip`
      });
      
    } catch (err) {
      console.error('Extraction error:', err);
      setError(err.response?.data?.detail || 'Failed to extract document contents');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (!result) return;
    
    const link = document.createElement('a');
    link.href = result.url;
    link.setAttribute('download', result.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const resetForm = () => {
    setFile(null);
    setError(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <SidebarLayout>
      <Container>
        <Header>
          <PageTitle>Document Extractor</PageTitle>
          <PageDescription>
            Upload a PDF or image file to extract text, images, and objects into a structured format.
          </PageDescription>
        </Header>
        
        <Content>
          <Card>
            <CardTitle>Upload Document</CardTitle>
            
            <UploadArea 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
              />
              
              {!file ? (
                <UploadPrompt>
                  <FaCloudUploadAlt size={48} color={colors.brandPrimary} />
                  <UploadText>
                    <strong>Click to upload</strong> or drag and drop
                    <div>PDF, JPG, or PNG (Max 10MB)</div>
                  </UploadText>
                </UploadPrompt>
              ) : (
                <FilePreview>
                  <FaFileAlt size={36} color={colors.brandPrimary} />
                  <FileInfo>
                    <FileName>{file.name}</FileName>
                    <FileSize>{(file.size / (1024 * 1024)).toFixed(2)} MB</FileSize>
                  </FileInfo>
                  <RemoveButton onClick={(e) => { e.stopPropagation(); resetForm(); }}>
                    Remove
                  </RemoveButton>
                </FilePreview>
              )}
            </UploadArea>
            
            {error && (
              <ErrorMessage>
                <FaExclamationTriangle size={16} />
                {error}
              </ErrorMessage>
            )}
            
            <ActionRow>
              <ExtractButton 
                onClick={handleExtract}
                disabled={!file || loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="spinner" size={16} />
                    Extracting...
                  </>
                ) : (
                  'Extract Document'
                )}
              </ExtractButton>
            </ActionRow>
            
            {loading && (
              <ProgressContainer>
                <ProgressLabel>{progress}% Complete</ProgressLabel>
                <ProgressBar>
                  <ProgressFill style={{ width: `${progress}%` }} />
                </ProgressBar>
              </ProgressContainer>
            )}
            
            {result && (
              <ResultCard>
                <ResultTitle>Extraction Complete!</ResultTitle>
                <ResultDescription>
                  Your document has been processed. The ZIP file contains:
                  <ul>
                    <li>A structured JSON file with extracted content</li>
                    <li>Image files for all embedded visuals</li>
                    <li>Page previews and additional metadata</li>
                  </ul>
                </ResultDescription>
                <DownloadButton onClick={handleDownload}>
                  <FaFileDownload size={16} />
                  Download ZIP File
                </DownloadButton>
              </ResultCard>
            )}
          </Card>
          
          <InfoCard>
            <InfoTitle>About Document Extractor</InfoTitle>
            <InfoText>
              This tool extracts content from PDFs and images into structured data:
              
              <FeatureList>
                <FeatureItem>
                  <FeatureTitle>Text Extraction</FeatureTitle>
                  <FeatureDescription>
                    Extracts all text content with exact positions and formatting information.
                  </FeatureDescription>
                </FeatureItem>
                
                <FeatureItem>
                  <FeatureTitle>Image Extraction</FeatureTitle>
                  <FeatureDescription>
                    Identifies and extracts all embedded images as separate files.
                  </FeatureDescription>
                </FeatureItem>
                
                <FeatureItem>
                  <FeatureTitle>Shape Detection</FeatureTitle>
                  <FeatureDescription>
                    Detects common shapes and objects like dice, checkmarks, and arrows.
                  </FeatureDescription>
                </FeatureItem>
                
                <FeatureItem>
                  <FeatureTitle>Structured Output</FeatureTitle>
                  <FeatureDescription>
                    Delivers a comprehensive JSON file with all extracted content.
                  </FeatureDescription>
                </FeatureItem>
              </FeatureList>
            </InfoText>
          </InfoCard>
        </Content>
      </Container>
    </SidebarLayout>
  );
};

// Styled components
const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const PageTitle = styled.h1`
  ${typography.displaySmBold};
  color: ${colors.textPrimary};
  margin: 0 0 8px 0;
`;

const PageDescription = styled.p`
  ${typography.textLgRegular};
  color: ${colors.textSecondary};
  margin: 0;
`;

const Content = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  padding: 24px;
`;

const CardTitle = styled.h2`
  ${typography.textXlBold};
  color: ${colors.textPrimary};
  margin: 0 0 24px 0;
`;

const UploadArea = styled.div`
  border: 2px dashed #e2e8f0;
  border-radius: 8px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${colors.brandPrimary};
    background-color: #f8fafc;
  }
`;

const UploadPrompt = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
`;

const UploadText = styled.div`
  ${typography.textMdRegular};
  color: ${colors.textSecondary};
  text-align: center;
  
  div {
    margin-top: 4px;
    ${typography.textSmRegular};
  }
`;

const FilePreview = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const FileInfo = styled.div`
  flex: 1;
`;

const FileName = styled.div`
  ${typography.textMdMedium};
  color: ${colors.textPrimary};
`;

const FileSize = styled.div`
  ${typography.textSmRegular};
  color: ${colors.textSecondary};
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: ${colors.textSecondary};
  cursor: pointer;
  padding: 4px 8px;
  ${typography.textSmMedium};
  
  &:hover {
    color: ${colors.accentError};
  }
`;

const ActionRow = styled.div`
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
`;

const ExtractButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: ${colors.brandPrimary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  ${typography.textMdMedium};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background-color: #2563eb;
  }
  
  &:disabled {
    background-color: #94a3b8;
    cursor: not-allowed;
  }
  
  .spinner {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ProgressContainer = styled.div`
  margin-top: 24px;
`;

const ProgressLabel = styled.div`
  ${typography.textSmMedium};
  color: ${colors.textSecondary};
  margin-bottom: 8px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background-color: ${colors.brandPrimary};
  transition: width 0.3s ease;
`;

const ResultCard = styled.div`
  margin-top: 24px;
  padding: 16px;
  background-color: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 8px;
`;

const ResultTitle = styled.h3`
  ${typography.textLgBold};
  color: #16a34a;
  margin: 0 0 8px 0;
`;

const ResultDescription = styled.div`
  ${typography.textSmRegular};
  color: #166534;
  
  ul {
    margin-top: 8px;
    padding-left: 20px;
  }
  
  li {
    margin-bottom: 4px;
  }
`;

const DownloadButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #16a34a;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  ${typography.textMdMedium};
  cursor: pointer;
  margin-top: 16px;
  transition: all 0.2s;
  
  &:hover {
    background-color: #15803d;
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background-color: #fee2e2;
  border-radius: 6px;
  ${typography.textSmMedium};
  color: #b91c1c;
`;

const InfoCard = styled.div`
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  padding: 24px;
`;

const InfoTitle = styled.h3`
  ${typography.textLgBold};
  color: ${colors.textPrimary};
  margin: 0 0 16px 0;
`;

const InfoText = styled.div`
  ${typography.textMdRegular};
  color: ${colors.textSecondary};
`;

const FeatureList = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FeatureItem = styled.div`
  padding: 12px;
  background-color: #f8fafc;
  border-radius: 8px;
`;

const FeatureTitle = styled.h4`
  ${typography.textMdBold};
  color: ${colors.textPrimary};
  margin: 0 0 4px 0;
`;

const FeatureDescription = styled.p`
  ${typography.textSmRegular};
  color: ${colors.textSecondary};
  margin: 0;
`;

export default DocumentExtractor; 