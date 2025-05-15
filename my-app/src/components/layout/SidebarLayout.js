import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { 
  FaHome, 
  FaClipboardList, 
  FaChartBar, 
  FaRobot, 
  FaQuestionCircle, 
  FaSignOutAlt, 
  FaUserCog,
  FaBars,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardCheck,
  FaFileAlt,
  FaQuestion
} from 'react-icons/fa';
import { supabase } from '../../config/supabaseClient';
import useAuth from '../../hooks/useAuth';

// Sidebar Item Component
const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <StyledSidebarItem active={active} onClick={onClick}>
    <SidebarItemIcon active={active}>
      <Icon size={18} />
    </SidebarItemIcon>
    <span>{label}</span>
    {active && <ActiveIndicator />}
  </StyledSidebarItem>
);

const SidebarLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const navItems = [
    { path: '/dashboard-new', label: 'Dashboard', icon: FaHome },
    { path: '/practice-tests', label: 'Practice Tests', icon: FaClipboardList },
    { path: '/practice-topics', label: 'Practice Topics', icon: FaClipboardCheck },
    { path: '/my-progress', label: 'My Progress', icon: FaChartBar },
    { path: '/chatbot', label: 'Ask EDTEC Bot', icon: FaRobot },
    { path: '/document-extractor', label: 'Document Extractor', icon: FaFileAlt },
    { path: '/help', label: 'Help & Support', icon: FaQuestionCircle },
    { path: '/doubt-solver', label: 'SSC CGL Doubt Solver', icon: FaQuestion },
  ];

  return (
    <LayoutContainer>
      {/* Mobile Overlay */}
      {mobileOpen && <Overlay onClick={toggleMobileSidebar} />}

      {/* Mobile Toggle Button */}
      <MobileToggle onClick={toggleMobileSidebar}>
        {mobileOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
      </MobileToggle>

      {/* Sidebar */}
      <Sidebar 
        collapsed={collapsed} 
        mobileOpen={mobileOpen}
      >
        <SidebarHeader>
          <Logo collapsed={collapsed}>
            {!collapsed ? (
              <LogoText>
                <LogoHighlight>ED</LogoHighlight>TEC
              </LogoText>
            ) : (
              <LogoText>
                <LogoHighlight>E</LogoHighlight>
              </LogoText>
            )}
          </Logo>
          <CollapseButton onClick={toggleSidebar}>
            {collapsed ? <FaChevronRight size={14} /> : <FaChevronLeft size={14} />}
          </CollapseButton>
        </SidebarHeader>

        <SidebarNav>
          {navItems.map((item) => (
            <SidebarItem
              key={item.path}
              icon={item.icon}
              label={!collapsed || mobileOpen ? item.label : ''}
              active={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (mobileOpen) setMobileOpen(false);
              }}
            />
          ))}
        </SidebarNav>

        <SidebarFooter>
          <ProfileSection onClick={() => navigate('/profile')}>
            <UserAvatar>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </UserAvatar>
            {(!collapsed || mobileOpen) && (
              <UserInfo>
                <UserName>{user?.email?.split('@')[0] || 'User'}</UserName>
                <UserRole>Student</UserRole>
              </UserInfo>
            )}
          </ProfileSection>

          <UserActions>
            <ActionButton onClick={() => navigate('/profile')} title="Settings">
              <FaUserCog size={16} />
              {(!collapsed || mobileOpen) && <span>Settings</span>}
            </ActionButton>
            <ActionButton onClick={handleLogout} title="Logout">
              <FaSignOutAlt size={16} />
              {(!collapsed || mobileOpen) && <span>Logout</span>}
            </ActionButton>
          </UserActions>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <MainContent collapsed={collapsed}>
        {children}
      </MainContent>
    </LayoutContainer>
  );
};

// Styled Components
const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  position: relative;
  background-color: #f8fafc;
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10;
  backdrop-filter: blur(4px);
  display: none;

  @media (max-width: 768px) {
    display: block;
  }
`;

const Sidebar = styled.aside`
  width: ${props => props.collapsed ? '80px' : '260px'};
  background-color: #fff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  height: 100vh;
  position: fixed;
  z-index: 20;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

  @media (max-width: 768px) {
    transform: translateX(${props => props.mobileOpen ? '0' : '-100%'});
    width: 260px;
  }
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 20px;
  border-bottom: 1px solid #f1f5f9;
`;

const Logo = styled.div`
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 1px;
  user-select: none;
`;

const LogoText = styled.span`
  background: linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
`;

const LogoHighlight = styled.span`
  color: #3b82f6;
`;

const CollapseButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #f8fafc;
    color: #3b82f6;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const SidebarNav = styled.nav`
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;

  /* Modern scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #e2e8f0 transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: #e2e8f0;
    border-radius: 6px;
  }
`;

const StyledSidebarItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  cursor: pointer;
  position: relative;
  color: ${props => props.active ? '#3b82f6' : '#64748b'};
  background-color: ${props => props.active ? '#eff6ff' : 'transparent'};
  font-weight: ${props => props.active ? '600' : 'normal'};
  margin: 4px 10px;
  border-radius: 10px;
  transition: all 0.2s ease;
  font-size: 0.95rem;

  &:hover {
    background-color: ${props => props.active ? '#eff6ff' : '#f8fafc'};
    color: ${props => props.active ? '#3b82f6' : '#334155'};
    transform: translateX(2px);
  }
`;

const SidebarItemIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background-color: ${props => props.active ? '#dbeafe' : '#f8fafc'};
  transition: all 0.2s ease;
  
  ${StyledSidebarItem}:hover & {
    background-color: ${props => props.active ? '#dbeafe' : '#f1f5f9'};
  }
`;

const ActiveIndicator = styled.div`
  width: 4px;
  height: 60%;
  background: linear-gradient(to bottom, #3b82f6, #2dd4bf);
  position: absolute;
  left: 0;
  top: 20%;
  border-radius: 0 4px 4px 0;
`;

const SidebarFooter = styled.div`
  padding: 16px;
  border-top: 1px solid #f1f5f9;
  margin-top: auto;
`;

const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: #f8fafc;
  }
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserName = styled.div`
  font-weight: 600;
  color: #1e293b;
`;

const UserRole = styled.div`
  font-size: 12px;
  color: #64748b;
`;

const UserActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #64748b;
  flex: 1;
  justify-content: center;
  transition: all 0.2s ease;
  font-weight: 500;

  &:hover {
    background-color: #f8fafc;
    color: #3b82f6;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  span {
    white-space: nowrap;
  }
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: ${props => props.collapsed ? '80px' : '260px'};
  transition: margin-left 0.3s ease;
  width: calc(100% - ${props => props.collapsed ? '80px' : '260px'});
  min-height: 100vh;

  @media (max-width: 768px) {
    margin-left: 0;
    width: 100%;
  }
`;

const MobileToggle = styled.button`
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 30;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: none;
  color: #1e293b;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #f8fafc;
    color: #3b82f6;
    transform: scale(1.05);
  }
  
  @media (max-width: 768px) {
    display: flex;
  }
`;

export default SidebarLayout; 