import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { 
  FaUsers, 
  FaClipboardList, 
  FaBook, 
  FaChartBar, 
  FaArrowLeft, 
  FaQuestion, 
  FaBoxes, 
  FaLayerGroup,
  FaCalculator,
  FaRobot
} from 'react-icons/fa';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

// Import admin components
import AdminUsers from './admin/AdminUsers';
import AdminTests from './admin/AdminTests';
import AdminDashboard from './admin/AdminDashboard';
import AdminExams from './admin/AdminExams';
import AdminQuestions from './admin/AdminQuestions';
import AdminSubjects from './admin/AdminSubjects';
import AdminTopics from './admin/AdminTopics';
import AdminScoringRules from './admin/AdminScoringRules';

const AdminConsole = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

    return (
    <Container>
      <Sidebar>
        <SidebarHeader>
          <h1>Admin</h1>
        </SidebarHeader>
        
        <NavItem 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')}
        >
          <FaChartBar /> Dashboard
        </NavItem>
        
        <NavItem 
          active={activeTab === 'users'} 
          onClick={() => setActiveTab('users')}
        >
          <FaUsers /> Users
        </NavItem>
        
        <NavItem 
          active={activeTab === 'tests'} 
          onClick={() => setActiveTab('tests')}
        >
          <FaClipboardList /> Tests
        </NavItem>
        
        <NavItem 
          active={activeTab === 'exams'} 
          onClick={() => setActiveTab('exams')}
        >
          <FaBook /> Exams
        </NavItem>
        
        <NavItem 
          active={activeTab === 'questions'} 
          onClick={() => setActiveTab('questions')}
        >
          <FaQuestion /> Questions
        </NavItem>
        
        <NavItem 
          active={activeTab === 'subjects'} 
          onClick={() => setActiveTab('subjects')}
        >
          <FaBoxes /> Subjects
        </NavItem>
        
        <NavItem 
          active={activeTab === 'topics'} 
          onClick={() => setActiveTab('topics')}
        >
          <FaLayerGroup /> Topics
        </NavItem>
        
        <NavItem 
          active={activeTab === 'scoring'} 
          onClick={() => setActiveTab('scoring')}
        >
          <FaCalculator /> Scoring Rules
        </NavItem>

        <NavItem 
          active={activeTab === 'ai-ingestion'} 
          onClick={() => navigate('/admin/ai-ingestion')}
        >
          <FaRobot /> AI Ingestion Tool
        </NavItem>
        
        <BackButton onClick={() => navigate('/dashboard')}>
          <FaArrowLeft /> Back to App
        </BackButton>
      </Sidebar>
      
      <Content>
        <Header>
          <h1>{getActiveTabTitle(activeTab)}</h1>
        </Header>
        
        <ContentArea>
          {activeTab === 'dashboard' && <AdminDashboard />}
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'tests' && <AdminTests />}
          {activeTab === 'exams' && <AdminExams />}
          {activeTab === 'questions' && <AdminQuestions />}
          {activeTab === 'subjects' && <AdminSubjects />}
          {activeTab === 'topics' && <AdminTopics />}
          {activeTab === 'scoring' && <AdminScoringRules />}
        </ContentArea>
      </Content>
    </Container>
  );
};

// Helper function to get the title based on active tab
const getActiveTabTitle = (tab) => {
  switch(tab) {
    case 'dashboard': return 'Admin Dashboard';
    case 'users': return 'Manage Users';
    case 'tests': return 'Manage Tests';
    case 'exams': return 'Manage Exams';
    case 'questions': return 'Manage Questions';
    case 'subjects': return 'Manage Subjects';
    case 'topics': return 'Manage Topics';
    case 'scoring': return 'Manage Scoring Rules';
    case 'ai-ingestion': return 'AI Question Ingestion Tool';
    default: return 'Admin Console';
  }
}

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

export default AdminConsole; 