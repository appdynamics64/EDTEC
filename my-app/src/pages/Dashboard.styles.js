import styled from 'styled-components';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

// Container styles
export const Container = styled.div`
  background-color: #F5F7FA;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

export const ContentContainer = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

// Header styles
export const Navbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: ${colors.backgroundPrimary};
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
  position: sticky;
  top: 0;
  z-index: 10;
`;

export const Logo = styled.div`
  color: ${colors.brandPrimary};
`;

export const NavActions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

export const ProfileContainer = styled.div`
  position: relative;
`;

export const ProfileMenu = styled.div`
  position: absolute;
  top: 60px;
  right: 0;
  background-color: ${colors.backgroundPrimary};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 8px 0;
  min-width: 160px;
  z-index: 100;
`;

export const ProfileMenuItem = styled.div`
  padding: 10px 16px;
  cursor: pointer;
  ${typography.textSmMedium};
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${colors.backgroundSecondary};
  }
`;

export const ProfileAvatar = styled.div`
  width: 40px;
  height: 40px;
  background-color: ${colors.brandPrimary};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid ${colors.backgroundSecondary};
  overflow: hidden;
`;

export const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const AvatarText = styled.span`
  color: ${colors.backgroundPrimary};
  ${typography.textMdBold};
`;

export const AdminButton = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  background-color: ${colors.backgroundSecondary};
  color: ${colors.brandPrimary};
  border: none;
  ${typography.textSmMedium};
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${colors.backgroundSecondary}dd;
  }
`;

// Welcome section styles
export const WelcomeSection = styled.div`
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
`;

export const GreetingCard = styled.div`
  flex: 1 1 60%;
  background-color: ${colors.brandPrimary};
  border-radius: 16px;
  padding: 24px;
  color: ${colors.backgroundPrimary};
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  background-image: linear-gradient(120deg, #6b74e0, #4956e3);
  position: relative;
  overflow: hidden;
`;

export const GreetingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

export const TimeGreeting = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

export const ExamBadge = styled.div`
  background-color: rgba(255,255,255,0.2);
  padding: 6px 12px;
  border-radius: 20px;
  margin-top: 12px;
  display: inline-flex;
`;

export const StatsContainer = styled.div`
  flex: 1 1 30%;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const StatCard = styled.div`
  background-color: ${colors.backgroundPrimary};
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  flex: 1;
`;

export const StatIcon = styled.div`
  font-size: 24px;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background-color: ${colors.backgroundSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const StatInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

// Action buttons styles
export const ActionButtonsContainer = styled.div`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
`;

export const ActionCard = styled.div`
  flex: 1 1 45%;
  min-width: 250px;
  background-color: ${colors.backgroundPrimary};
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.12);
  }
`;

export const ActionCardIcon = styled.div`
  font-size: 28px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: ${colors.backgroundSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ActionCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// Tests section styles
export const TestsSection = styled.section`
  background-color: ${colors.backgroundPrimary};
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
`;

export const TestsSectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

export const SeeAllButton = styled.button`
  background-color: transparent;
  color: ${colors.brandPrimary};
  border: none;
  ${typography.textSmMedium};
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${colors.backgroundSecondary};
  }
`;

export const TestCategoriesContainer = styled.div`
  position: relative;
  margin-bottom: 24px;
`;

export const TestCategories = styled.div`
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: thin;
  -ms-overflow-style: none;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: ${colors.textSecondary};
    border-radius: 4px;
  }
`;

export const CategoryButton = styled.button`
  background-color: transparent;
  border: none;
  padding: 8px 16px;
  ${typography.textSmMedium};
  cursor: pointer;
  transition: all 0.2s;
  color: ${colors.textSecondary};
  border-radius: 8px;
  
  &:hover {
    background-color: ${colors.backgroundSecondary};
    color: ${colors.textPrimary};
  }
  
  &.active {
    background-color: ${colors.backgroundSecondary};
    color: ${colors.textPrimary};
    font-weight: 600;
  }
`;

export const TestGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

export const TestCard = styled.div`
  background-color: ${colors.backgroundPrimary};
  border-radius: 12px;
  border: 1px solid ${colors.backgroundSecondary};
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.08);
  }
`;

export const TestCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

export const CompletedBadge = styled.div`
  background-color: ${colors.accentSuccess}30;
  color: ${colors.accentSuccess};
  ${typography.textXsRegular};
  padding: 4px 8px;
  border-radius: 4px;
`;

export const TestCardDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const TestDetail = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const TestDetailIcon = styled.span`
  font-size: 16px;
  color: ${colors.textSecondary};
`;

export const TestCardFooter = styled.div`
  margin-top: auto;
`;

export const StartTestButton = styled.button`
  width: 100%;
  padding: 10px;
  background-color: ${colors.brandPrimary};
  color: ${colors.backgroundPrimary};
  border: none;
  border-radius: 8px;
  ${typography.textSmMedium};
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #3f49cb;
  }
`;

export const ScoreContainer = styled.div`
  margin-top: 12px;
`;

export const ScoreBar = styled.div`
  height: 8px;
  background-color: ${colors.backgroundSecondary};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
`;

export const ScoreProgress = styled.div`
  height: 100%;
  background-color: ${colors.accentSuccess};
  border-radius: 4px;
  width: ${props => props.percentage}%;
`;

export const ScoreText = styled.div`
  ${typography.textSmMedium};
  color: ${colors.accentSuccess};
  text-align: right;
`;

// Loading and empty state styles
export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  gap: 16px;
`;

export const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${colors.backgroundSecondary};
  border-top: 3px solid ${colors.brandPrimary};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  gap: 16px;
  text-align: center;
`;

export const EmptyStateIcon = styled.div`
  font-size: 48px;
  margin-bottom: 8px;
`;

export const CreateTestButton = styled.button`
  padding: 10px 24px;
  background-color: ${colors.brandPrimary};
  color: ${colors.backgroundPrimary};
  border: none;
  border-radius: 8px;
  ${typography.textSmMedium};
  cursor: pointer;
  margin-top: 16px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #3f49cb;
  }
`;

export const CategoriesList = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`; 