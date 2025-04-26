import React from 'react';
import styled from 'styled-components';
import SidebarLayout from '../components/layout/SidebarLayout';
import { 
  FaQuestionCircle, 
  FaEnvelope, 
  FaBook, 
  FaGraduationCap, 
  FaInfoCircle, 
  FaLightbulb, 
  FaDownload, 
  FaHeadset, 
  FaChevronRight, 
  FaRobot, 
  FaUser, 
  FaChartBar 
} from 'react-icons/fa';

const Help = () => {
  return (
    <SidebarLayout>
      <PageContainer>
        <PageHeader>
          <BlurredBackground />
          <HeaderContent>
            <PageTitle>Help & Support</PageTitle>
            <HelpSubtitle>Find answers and resources to help you succeed</HelpSubtitle>
          </HeaderContent>
        </PageHeader>
        
        <ContentContainer>
          <SectionTitle>
            <SectionIcon><FaQuestionCircle /></SectionIcon>
            Frequently Asked Questions
          </SectionTitle>
          <FAQContainer>
            <FAQCard>
              <FAQQuestion>
                <QuestionIcon>
                  <FaQuestionCircle />
                </QuestionIcon>
                <span>How do I track my progress?</span>
              </FAQQuestion>
              <FAQAnswer>
                You can track your progress in the "My Progress" section. This dashboard shows your test scores, completed questions, and overall performance metrics. The system automatically calculates your mastery level for each topic based on your test results.
              </FAQAnswer>
              <FAQLink>
                <span>View Progress Dashboard</span>
                <FaChevronRight size={12} />
              </FAQLink>
            </FAQCard>
            
            <FAQCard>
              <FAQQuestion>
                <QuestionIcon>
                  <FaQuestionCircle />
                </QuestionIcon>
                <span>How are scores calculated?</span>
              </FAQQuestion>
              <FAQAnswer>
                Scores are calculated based on the number of correct answers. Each question is weighted equally unless otherwise specified in the test description. Your final score is displayed as a percentage of correct answers.
              </FAQAnswer>
              <FAQLink>
                <span>Learn More About Scoring</span>
                <FaChevronRight size={12} />
              </FAQLink>
            </FAQCard>
            
            <FAQCard>
              <FAQQuestion>
                <QuestionIcon>
                  <FaQuestionCircle />
                </QuestionIcon>
                <span>Can I retry tests?</span>
              </FAQQuestion>
              <FAQAnswer>
                Yes, you can retake any test. Your previous scores will be saved in your history, and you can compare your performance over time. Retaking tests is a great way to reinforce learning and improve your mastery of the material.
              </FAQAnswer>
              <FAQLink>
                <span>Go to Practice Tests</span>
                <FaChevronRight size={12} />
              </FAQLink>
            </FAQCard>
          </FAQContainer>
          
          <SectionTitle>
            <SectionIcon><FaHeadset /></SectionIcon>
            Contact Support
          </SectionTitle>
          <ContactContainer>
            <ContactCard>
              <ContactIcon className="email">
                <FaEnvelope />
              </ContactIcon>
              <ContactInfo>
                <ContactTitle>Email Support</ContactTitle>
                <ContactDescription>
                  Send us an email and we'll respond within 24 hours.
                </ContactDescription>
                <ContactAction href="mailto:support@edtec.com">
                  support@edtec.com
                </ContactAction>
              </ContactInfo>
            </ContactCard>
            
            <ContactCard>
              <ContactIcon className="knowledge">
                <FaBook />
              </ContactIcon>
              <ContactInfo>
                <ContactTitle>Knowledge Base</ContactTitle>
                <ContactDescription>
                  Browse our comprehensive guides and tutorials.
                </ContactDescription>
                <ContactAction as="button">
                  Browse Articles
                </ContactAction>
              </ContactInfo>
            </ContactCard>
            
            <ContactCard>
              <ContactIcon className="resources">
                <FaGraduationCap />
              </ContactIcon>
              <ContactInfo>
                <ContactTitle>Learning Resources</ContactTitle>
                <ContactDescription>
                  Access additional learning materials and resources.
                </ContactDescription>
                <ContactAction as="button">
                  View Resources
                </ContactAction>
              </ContactInfo>
            </ContactCard>
          </ContactContainer>
          
          <ResourcesSection>
            <ResourcesGrid>
              <ResourceCard>
                <ResourceIcon className="guide">
                  <FaLightbulb size={24} />
                </ResourceIcon>
                <ResourceTitle>Study Guides</ResourceTitle>
                <ResourceDescription>
                  Access comprehensive study materials organized by topic.
                </ResourceDescription>
                <ResourceButton>
                  Browse Guides
                </ResourceButton>
              </ResourceCard>
              
              <ResourceCard>
                <ResourceIcon className="download">
                  <FaDownload size={24} />
                </ResourceIcon>
                <ResourceTitle>Downloadable Content</ResourceTitle>
                <ResourceDescription>
                  Access PDF worksheets and printable study materials.
                </ResourceDescription>
                <ResourceButton>
                  View Downloads
                </ResourceButton>
              </ResourceCard>
            </ResourcesGrid>
          </ResourcesSection>
          
          <SectionTitle>
            <SectionIcon><FaInfoCircle /></SectionIcon>
            About EDTEC
          </SectionTitle>
          <AboutContainer>
            <AboutCard>
              <AboutLogo>
                <LogoText>
                  <LogoHighlight>ED</LogoHighlight>TEC
                </LogoText>
              </AboutLogo>
              <AboutDescription>
                EDTEC is an educational technology platform designed to help students prepare for standardized tests and improve their academic performance. Our mission is to make high-quality education accessible to all through personalized learning experiences powered by advanced technology.
              </AboutDescription>
              <AboutFeatures>
                <FeatureItem>
                  <FeatureIcon className="ai">
                    <FaRobot />
                  </FeatureIcon>
                  <FeatureText>AI-Powered Learning</FeatureText>
                </FeatureItem>
                <FeatureItem>
                  <FeatureIcon className="personal">
                    <FaUser />
                  </FeatureIcon>
                  <FeatureText>Personalized Practice</FeatureText>
                </FeatureItem>
                <FeatureItem>
                  <FeatureIcon className="analytics">
                    <FaChartBar />
                  </FeatureIcon>
                  <FeatureText>Detailed Analytics</FeatureText>
                </FeatureItem>
              </AboutFeatures>
              <AboutVersion>
                <VersionIcon><FaInfoCircle size={14} /></VersionIcon>
                <span>Version 1.0.0</span>
              </AboutVersion>
            </AboutCard>
          </AboutContainer>
        </ContentContainer>
      </PageContainer>
    </SidebarLayout>
  );
};

// Styled Components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  position: relative;
  height: 200px;
  overflow: hidden;
  border-radius: 0 0 20px 20px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    height: 160px;
  }
`;

const BlurredBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  z-index: 0;
`;

const HeaderContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 50px 32px;
  color: white;
  
  @media (max-width: 768px) {
    padding: 32px;
  }
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const HelpSubtitle = styled.p`
  font-size: 1.1rem;
  margin: 0;
  opacity: 0.9;
  max-width: 600px;
`;

const ContentContainer = styled.div`
  padding: 0 32px 32px;
  
  @media (max-width: 640px) {
    padding: 0 16px 16px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 40px 0 20px 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SectionIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  box-shadow: 0 4px 8px rgba(79, 70, 229, 0.2);
`;

const FAQContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FAQCard = styled.div`
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  padding: 24px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  }
`;

const FAQQuestion = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-weight: 600;
  font-size: 1.1rem;
  color: #1e293b;
  margin-bottom: 16px;
`;

const QuestionIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 8px rgba(79, 70, 229, 0.2);
`;

const FAQAnswer = styled.p`
  color: #4b5563;
  margin: 0 0 20px 0;
  line-height: 1.6;
  font-size: 0.95rem;
  flex: 1;
`;

const FAQLink = styled.a`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4f46e5;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  margin-top: auto;
  align-self: flex-start;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ContactContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ContactCard = styled.div`
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  padding: 24px;
  display: flex;
  gap: 20px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  }
`;

const ContactIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
  
  &.email {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: white;
    box-shadow: 0 4px 8px rgba(79, 70, 229, 0.2);
  }
  
  &.knowledge {
    background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%);
    color: white;
    box-shadow: 0 4px 8px rgba(14, 165, 233, 0.2);
  }
  
  &.resources {
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
    color: white;
    box-shadow: 0 4px 8px rgba(245, 158, 11, 0.2);
  }
`;

const ContactInfo = styled.div`
  flex: 1;
`;

const ContactTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
`;

const ContactDescription = styled.p`
  font-size: 0.95rem;
  color: #4b5563;
  margin: 0 0 16px 0;
  line-height: 1.5;
`;

const ContactAction = styled.a`
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #4f46e5;
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #f1f5f9;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
`;

const ResourcesSection = styled.div`
  margin-bottom: 40px;
`;

const ResourcesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ResourceCard = styled.div`
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  }
`;

const ResourceIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  
  &.guide {
    background: linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%);
    color: white;
    box-shadow: 0 4px 8px rgba(139, 92, 246, 0.2);
  }
  
  &.download {
    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
    color: white;
    box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2);
  }
`;

const ResourceTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
`;

const ResourceDescription = styled.p`
  font-size: 0.95rem;
  color: #4b5563;
  margin: 0 0 20px 0;
  line-height: 1.5;
`;

const ResourceButton = styled.button`
  padding: 10px 20px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 8px rgba(79, 70, 229, 0.2);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(79, 70, 229, 0.3);
  }
`;

const AboutContainer = styled.div`
  margin-bottom: 40px;
`;

const AboutCard = styled.div`
  background-color: white;
  border-radius: A16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  padding: 32px;
  text-align: center;
`;

const AboutLogo = styled.div`
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 20px;
  display: inline-block;
`;

const LogoText = styled.span`
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const LogoHighlight = styled.span`
  color: #4f46e5;
`;

const AboutDescription = styled.p`
  font-size: 1rem;
  color: #4b5563;
  line-height: 1.7;
  margin: 0 0 32px 0;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
`;

const AboutFeatures = styled.div`
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 32px;
  flex-wrap: wrap;
`;

const FeatureItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const FeatureIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: 8px;
  
  &.ai {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: white;
    box-shadow: 0 4px 8px rgba(79, 70, 229, 0.2);
  }
  
  &.personal {
    background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%);
    color: white;
    box-shadow: 0 4px 8px rgba(14, 165, 233, 0.2);
  }
  
  &.analytics {
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
    color: white;
    box-shadow: 0 4px 8px rgba(245, 158, 11, 0.2);
  }
`;

const FeatureText = styled.span`
  font-size: 0.95rem;
  font-weight: 500;
  color: #1e293b;
`;

const AboutVersion = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: #64748b;
  gap: 8px;
`;

const VersionIcon = styled.div`
  display: flex;
  align-items: center;
  color: #7c3aed;
`;

export default Help; 