import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';

const AVATAR_OPTIONS = Array.from({ length: 8 }, (_, i) => 
  `https://api.dicebear.com/7.x/avataaars/png/seed=${i + 1}`
);

const ProfileModal = ({ isOpen, onClose, userData, onUpdate }) => {
  const [name, setName] = useState(userData?.name || '');
  const [email, setEmail] = useState(userData?.email || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    if (userData) {
      setName(userData.name);
      setEmail(userData.email);
      if (userData.avatar_url) {
        downloadAvatar(userData.avatar_url);
      }
    }
  }, [userData]);

  useEffect(() => {
    if (!isOpen) {
      setShowGallery(false);
    }
  }, [isOpen]);

  const downloadAvatar = async (path) => {
    try {
      if (path.startsWith('http')) {
        setAvatar(path);
        return;
      }

      const { data, error } = await supabase.storage
        .from('avatars')
        .download(path);
      if (error) throw error;
      setAvatar(URL.createObjectURL(data));
    } catch (error) {
      console.error('Error downloading avatar:', error);
    }
  };

  const handleAvatarUpload = async (event) => {
    try {
      setLoading(true);
      setError(null);

      const file = event.target.files[0];
      if (!file) return;

      const { data: bucketData, error: bucketError } = await supabase.storage
        .getBucket('avatars');
      
      if (bucketError && bucketError.message.includes('not found')) {
        await supabase.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 1024 * 1024, // 1MB
        });
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', userData.id);

      if (updateError) throw updateError;

      setAvatar(URL.createObjectURL(file));
      onUpdate();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = async (avatarUrl) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', userData.id);

      if (updateError) throw updateError;

      setAvatar(avatarUrl);
      setShowGallery(false);
      onUpdate();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('users')
        .update({ name })
        .eq('id', userData.id);

      if (error) throw error;

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={typography.textLgBold}>Profile</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.content}>
          <div style={styles.avatarSection}>
            <div style={styles.avatarContainer}>
              {avatar ? (
                <img src={avatar} alt="Profile" style={styles.avatar} />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  {name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div style={styles.avatarActions}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={styles.fileInput}
                  id="avatar-upload"
                />
                <label 
                  htmlFor="avatar-upload" 
                  style={{
                    ...styles.actionButton,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Upload Photo
                </label>
                <button 
                  onClick={() => setShowGallery(!showGallery)}
                  style={{
                    ...styles.actionButton,
                    backgroundColor: showGallery ? colors.brandPrimary : colors.backgroundSecondary,
                    color: showGallery ? colors.backgroundPrimary : colors.textPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Choose Avatar
                </button>
              </div>
              
              {showGallery && (
                <div style={styles.avatarGallery}>
                  <h3 style={typography.textMdBold}>Choose an Avatar</h3>
                  <div style={styles.avatarGrid}>
                    {AVATAR_OPTIONS.map((avatarUrl, index) => (
                      <div
                        key={index}
                        onClick={() => handleAvatarSelect(avatarUrl)}
                        style={styles.avatarOption}
                      >
                        <img 
                          src={avatarUrl} 
                          alt={`Avatar ${index + 1}`} 
                          style={styles.avatarOptionImage}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Name</label>
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
              />
            ) : (
              <p style={styles.value}>{name}</p>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <p style={styles.value}>{email}</p>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.actions}>
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  style={styles.saveButton}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                style={styles.editButton}
              >
                Edit Profile
              </button>
            )}
          </div>
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
    maxWidth: '400px',
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
  avatarSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  avatarContainer: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    fontWeight: 'bold',
  },
  fileInput: {
    display: 'none',
  },
  actionButton: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '20px',
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '500',
    letterSpacing: '0.1px',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: colors.backgroundSecondary,
      opacity: 0.9,
    },
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    color: colors.textSecondary,
    ...typography.textSmMedium,
  },
  value: {
    color: colors.textPrimary,
    ...typography.textMdRegular,
  },
  input: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: `1px solid ${colors.textSecondary}`,
    backgroundColor: colors.backgroundSecondary,
    color: colors.textPrimary,
    ...typography.textMdRegular,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '16px',
  },
  editButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
    cursor: 'pointer',
    ...typography.textSmMedium,
  },
  saveButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    backgroundColor: colors.brandPrimary,
    color: colors.backgroundPrimary,
    border: 'none',
    cursor: 'pointer',
    ...typography.textSmMedium,
  },
  cancelButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: colors.textPrimary,
    border: `1px solid ${colors.textSecondary}`,
    cursor: 'pointer',
    ...typography.textSmMedium,
  },
  error: {
    color: colors.accentError,
    ...typography.textSmRegular,
  },
  avatarActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    width: '100%',
  },
  avatarGallery: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: colors.backgroundPrimary,
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    width: '280px',
    marginTop: '8px',
    zIndex: 1,
  },
  avatarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginTop: '12px',
  },
  avatarOption: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    overflow: 'hidden',
    cursor: 'pointer',
    border: `2px solid ${colors.backgroundSecondary}`,
    transition: 'border-color 0.2s',
    ':hover': {
      borderColor: colors.brandPrimary,
    },
  },
  avatarOptionImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
};

export default ProfileModal; 