import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import { FaCamera, FaSpinner, FaTimes, FaCheck, FaExclamationTriangle, FaUser } from 'react-icons/fa';

// Completely redesigned avatar selector with fixed dimensions

// Update the avatar options with simpler, more reliable URLs
const AVATAR_OPTIONS = [
  // Simple, reliable avatar URLs with minimal parameters
  'https://api.dicebear.com/7.x/avataaars/svg',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/bottts/svg',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Dusty',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Crumble',
  'https://api.dicebear.com/7.x/micah/svg',
  'https://api.dicebear.com/7.x/micah/svg?seed=Jasper',
  'https://api.dicebear.com/7.x/personas/svg',
  'https://api.dicebear.com/7.x/personas/svg?seed=Maya',
  // Alternative: Use UI Avatars service which is very reliable
  'https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=Student&bold=true&size=120',
  'https://ui-avatars.com/api/?background=FF5733&color=fff&name=Learner&bold=true&size=120',
  'https://ui-avatars.com/api/?background=28B463&color=fff&name=Scholar&bold=true&size=120',
  'https://ui-avatars.com/api/?background=7D3C98&color=fff&name=Genius&bold=true&size=120',
  'https://ui-avatars.com/api/?background=F1C40F&color=fff&name=Bright&bold=true&size=120',
  'https://ui-avatars.com/api/?background=1ABC9C&color=fff&name=Smart&bold=true&size=120',
  'https://ui-avatars.com/api/?background=E74C3C&color=fff&name=Clever&bold=true&size=120',
  'https://ui-avatars.com/api/?background=3498DB&color=fff&name=Wise&bold=true&size=120',
  // Another alternative: Use RoboHash for fun robot avatars
  'https://robohash.org/student1.png?size=120x120&set=set3',
  'https://robohash.org/student2.png?size=120x120&set=set3',
  'https://robohash.org/student3.png?size=120x120&set=set3',
  'https://robohash.org/student4.png?size=120x120&set=set3',
  'https://robohash.org/student5.png?size=120x120&set=set3',
  'https://robohash.org/student6.png?size=120x120&set=set3',
  'https://robohash.org/student7.png?size=120x120&set=set3',
  'https://robohash.org/student8.png?size=120x120&set=set3'
];

const ProfileModal = ({ isOpen, onClose, userData, onUpdate }) => {
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (userData) {
      setName(userData.name || '');
      setAvatarUrl(userData.profile_photo_url || null);
      setPreviewUrl(userData.profile_photo_url || null);
    }
  }, [userData]);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset states
    setUploadError(null);
    setUploadSuccess(false);
    
    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setUploadError('Image size should be less than 5MB');
      return;
    }

    // Create a preview immediately to provide visual feedback
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
      // Close the avatar selector to show the preview
      setShowAvatarSelector(false);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    try {
      setUploading(true);
      
      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      // Try to use the 'avatars' bucket directly without creating it
      const filePath = `${userData.id}/${fileName}`;
      
      // Upload the file
      const { error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        // If the error is because the bucket doesn't exist, use a fallback approach
        if (uploadError.message.includes('bucket not found') || 
            uploadError.message.includes('violates row-level security policy')) {
          
          // Fallback: Use a data URL or a default avatar service
          setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.id}`);
          setUploadSuccess(true);
          setUploadError('Using default avatar as custom uploads are not available');
          return;
        }
        
        throw uploadError;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      setAvatarUrl(publicUrl);
      setUploadSuccess(true);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setUploadError('Failed to upload image. Using a default avatar instead.');
      
      // Fallback to a default avatar service
      setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.id}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarSelect = (avatarUrl) => {
    setPreviewUrl(avatarUrl);
    setAvatarUrl(avatarUrl);
    setShowAvatarSelector(false);
    setUploadSuccess(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }
    
    try {
      setSaving(true);
      
      const updates = {
        name: name.trim(),
        updated_at: new Date()
      };
      
      // Only update profile_photo_url if a new avatar was uploaded
      if (avatarUrl && avatarUrl !== userData.profile_photo_url) {
        updates.profile_photo_url = avatarUrl;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userData.id);
      
      if (error) throw error;
      
      // Call the onUpdate callback with the updated data
      onUpdate({
        ...userData,
        ...updates
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    setShowAvatarSelector(true);
  };

  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalHeader>
          <h2>Edit Profile</h2>
          <CloseButton onClick={onClose}>
            <FaTimes />
          </CloseButton>
        </ModalHeader>
        
        <ModalBody>
          <AvatarSection>
            <AvatarContainer onClick={handleAvatarClick}>
              {previewUrl ? (
                <Avatar src={previewUrl} alt={name} />
              ) : (
                <AvatarPlaceholder>
                  {name ? name.charAt(0).toUpperCase() : 'U'}
                </AvatarPlaceholder>
              )}
              <AvatarOverlay>
                <FaCamera />
                <span>Change</span>
              </AvatarOverlay>
            </AvatarContainer>
            
            {showAvatarSelector && (
              <AvatarSelectorContainer>
                <AvatarSelectorHeader>
                  <h3>Choose an Avatar</h3>
                  <CloseButton onClick={() => setShowAvatarSelector(false)}>
                    <FaTimes />
                  </CloseButton>
                </AvatarSelectorHeader>
                
                <AvatarGrid>
                  {AVATAR_OPTIONS.map((avatar, index) => (
                    <AvatarOption 
                      key={index} 
                      onClick={() => handleAvatarSelect(avatar)}
                    >
                      <img src={avatar} alt={`Avatar option ${index + 1}`} />
                    </AvatarOption>
                  ))}
                  
                  <UploadAvatarOption onClick={() => fileInputRef.current.click()}>
                    <FaUser />
                    <span>Upload Custom</span>
                  </UploadAvatarOption>
                </AvatarGrid>
              </AvatarSelectorContainer>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/gif"
              style={{ display: 'none' }}
            />
            
            {uploading && (
              <UploadStatus>
                <FaSpinner className="spinner" />
                <span>Uploading...</span>
              </UploadStatus>
            )}
            
            {uploadError && (
              <UploadStatus error>
                <FaExclamationTriangle />
                <span>{uploadError}</span>
              </UploadStatus>
            )}
            
            {uploadSuccess && (
              <UploadStatus success>
                <FaCheck />
                <span>Avatar selected!</span>
              </UploadStatus>
            )}
          </AvatarSection>
          
          <FormGroup>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Email</Label>
            <DisabledInput>{userData?.email || 'No email available'}</DisabledInput>
          </FormGroup>
        </ModalBody>
        
        <ModalFooter>
          <Button secondary onClick={onClose}>Cancel</Button>
          <Button primary onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <FaSpinner className="spinner" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};

// Completely redesigned avatar selector with fixed dimensions
const AvatarSelectorContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  width: 340px; /* Slightly wider */
  height: 420px; /* Slightly taller */
  display: flex;
  flex-direction: column;
  z-index: 1100;
  overflow: hidden;
`;

// Update the header to be more modern
const AvatarSelectorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  background-color: ${colors.backgroundPrimary || '#ffffff'};
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: ${colors.textPrimary || '#1f2937'};
  }
`;

// Update the grid to better display the avatars
const AvatarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  background-color: ${colors.backgroundSecondary || '#f9fafb'};
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.15);
    border-radius: 20px;
  }
`;

// Add the missing AvatarOption styled component
const AvatarOption = styled.div`
  width: 130px;
  height: 130px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  &:hover {
    border-color: ${colors.brandPrimary || '#4f46e5'};
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    transform: translateY(-1px);
  }
  
  img {
    width: 110px;
    height: 110px;
    transition: transform 0.2s ease;
  }
`;

// Update the upload option to match the new style
const UploadAvatarOption = styled.div`
  width: 130px;
  height: 130px;
  border-radius: 12px;
  border: 2px dashed ${colors.borderPrimary || '#e5e7eb'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 10px;
  background-color: white;
  
  &:hover {
    border-color: ${colors.brandPrimary || '#4f46e5'};
    background-color: ${colors.backgroundSecondary || '#f9fafb'};
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  }
  
  svg {
    font-size: 26px;
    color: ${colors.brandPrimary || '#4f46e5'};
  }
  
  span {
    font-size: 14px;
    font-weight: 500;
    color: ${colors.textSecondary || '#6b7280'};
    text-align: center;
  }
`;

// Enhanced overlay with backdrop filter for modern glass effect
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px); // Modern blur effect
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
  animation: fadeInOverlay 0.2s ease-out;
  
  @keyframes fadeInOverlay {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

// Also enhance the avatar container for better interaction
const AvatarContainer = styled.div`
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); // Add shadow for depth
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
    
    > div {
      opacity: 1;
    }
  }
`;

// Improved avatar overlay with better visual feedback
const AvatarOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6); // Darker for better contrast
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.3s ease;
  
  svg {
    font-size: 28px;
    margin-bottom: 8px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)); // Add shadow to icon
  }
  
  span {
    font-size: 14px;
    font-weight: 500;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3)); // Add shadow to text
  }
`;

// Keep all the existing styled components
const ModalContainer = styled.div`
  background-color: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${colors.borderPrimary || '#e5e7eb'};
  
  h2 {
    ${typography.textXlBold || 'font-size: 1.25rem; font-weight: 700;'};
    margin: 0;
    color: ${colors.textPrimary || '#1f2937'};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  color: ${colors.textSecondary || '#6b7280'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: ${colors.textPrimary || '#1f2937'};
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const AvatarSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
  position: relative;
`;

const Avatar = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const AvatarPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background-color: ${colors.brandPrimary || '#4f46e5'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 600;
`;

const UploadStatus = ({ success, error, children, ...rest }) => (
  <div 
    data-success={success ? "true" : undefined}
    data-error={error ? "true" : undefined}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '12px',
      padding: '8px 12px',
      borderRadius: '6px',
      backgroundColor: error ? '#FEF2F2' : success ? '#ECFDF5' : '#F3F4F6',
      color: error ? '#DC2626' : success ? '#059669' : '#6B7280'
    }}
    {...rest}
  >
    {children}
  </div>
);

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  ${typography.textSmBold || 'font-size: 0.875rem; font-weight: 600;'};
  color: ${colors.textSecondary || '#6b7280'};
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${colors.borderPrimary || '#e5e7eb'};
  border-radius: 8px;
  ${typography.textMdRegular || 'font-size: 1rem;'};
  color: ${colors.textPrimary || '#1f2937'};
  
  &:focus {
    outline: none;
    border-color: ${colors.brandPrimary || '#4f46e5'};
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
  }
`;

const DisabledInput = styled.div`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${colors.borderPrimary || '#e5e7eb'};
  border-radius: 8px;
  background-color: ${colors.backgroundSecondary || '#f3f4f6'};
  ${typography.textMdRegular || 'font-size: 1rem;'};
  color: ${colors.textSecondary || '#6b7280'};
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${colors.borderPrimary || '#e5e7eb'};
`;

const Button = ({ primary, secondary, disabled, children, ...rest }) => (
  <button
    disabled={disabled}
    style={{
      padding: '10px 16px',
      borderRadius: '6px',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      backgroundColor: primary ? colors.brandPrimary : secondary ? colors.backgroundSecondary : '#e5e7eb',
      color: primary ? 'white' : colors.textPrimary,
      fontWeight: '500',
      fontSize: '0.875rem',
      transition: 'background-color 0.2s',
      opacity: disabled ? 0.7 : 1
    }}
    {...rest}
  >
    {children}
  </button>
);

export default ProfileModal; 