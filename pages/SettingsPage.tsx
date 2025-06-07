import React, { useState, useEffect, useCallback } from 'react';
import { UserProfiles, User, UserProfile, UserRole } from '../types';
import { DEFAULT_USER_PROFILES, USER_PROFILES_SHEET_NAME } from '../constants';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
// Removed useLocalStorage as profiles are now managed via useAuth and Google Sheets

const SettingsPage: React.FC = () => {
  const { currentUser, changePassword, allUserProfiles, isLoading: authLoading, updateProfileInSheet, fetchAllSheetData } = useAuth();
  
  // Local state for form edits, initialized from allUserProfiles from AuthContext
  const [localProfiles, setLocalProfiles] = useState<UserProfiles>(DEFAULT_USER_PROFILES);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeMessage, setPasswordChangeMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    // Initialize localProfiles with the centrally managed profiles from useAuth
    // This ensures that the form starts with the latest data from Sheets (or defaults if sheets data isn't there yet)
    if (allUserProfiles) {
        setLocalProfiles(allUserProfiles);
    }
  }, [allUserProfiles]);

  // If currentUser changes (e.g., after login), ensure localProfiles also reflects this if it's the current user's profile
  useEffect(() => {
    if (currentUser && allUserProfiles[currentUser.id as User]) {
        setLocalProfiles(prev => ({
            ...prev, // Keep other profile if admin is editing
            [currentUser.id as User]: allUserProfiles[currentUser.id as User]
        }));
    }
  }, [currentUser, allUserProfiles]);


  const handleProfileInputChange = (user: User, field: keyof Omit<UserProfile, 'id'>, value: string | number) => {
    if (!currentUser) return;

    // Permissions check
    if (currentUser.role === UserRole.LIMITED && user !== currentUser.id) {
      return; // Limited user cannot edit others' profiles
    }
    if (currentUser.role === UserRole.LIMITED && field === 'profitShare') {
        return; // Limited user cannot edit profitShare
    }

    let processedValue = value;
    if (field === 'profitShare') {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        setSaveMessage('Error: Profit share must be between 0 and 100.');
        setTimeout(() => setSaveMessage(''), 3000);
        return; 
      }
      processedValue = numValue;
    }

    setLocalProfiles(prev => ({
      ...prev,
      [user]: {
        ...prev[user],
        id: user, // ensure id is always present
        name: user, // name is derived from User enum, not editable here
        [field]: processedValue,
      },
    }));
    setSaveMessage(''); // Clear previous save messages on new input
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
        setSaveMessage('Error: Not logged in.');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
    }
    setIsSaving(true);
    setSaveMessage('');

    let success = true;
    let profilesToUpdate: UserProfile[] = [];

    if (currentUser.role === UserRole.ADMIN) {
        const totalProfitShare = (Number(localProfiles[User.YAZAN].profitShare) || 0) + (Number(localProfiles[User.GHADEER].profitShare) || 0);
        if (totalProfitShare !== 100) {
            setSaveMessage('Error: Total profit share for Yazan and Ghadeer must sum to 100%.');
            setIsSaving(false);
            setTimeout(() => setSaveMessage(''), 5000);
            return;
        }
        profilesToUpdate.push(localProfiles[User.YAZAN]);
        profilesToUpdate.push(localProfiles[User.GHADEER]);
    } else if (currentUser.role === UserRole.LIMITED && currentUser.id) {
        // Limited user can only save their own profile
        const ownProfileKey = currentUser.id as User;
        const profileToSave: UserProfile = {
            ...allUserProfiles[ownProfileKey], // Start with the full profile from context (sheet data)
            // Apply changes made in localProfiles
            phone: localProfiles[ownProfileKey].phone,
            email: localProfiles[ownProfileKey].email,
            profilePic: localProfiles[ownProfileKey].profilePic,
            // name and id are fixed, profitShare is not editable by limited user
        };
        profilesToUpdate.push(profileToSave);
    }

    for (const profile of profilesToUpdate) {
        const result = await updateProfileInSheet(profile);
        if (!result) {
            success = false;
            setSaveMessage(`Error saving ${profile.name}'s profile. Please try again.`);
            break; 
        }
    }

    if (success) {
      setSaveMessage('Settings saved successfully to Google Sheets!');
      // Data will be re-fetched by useAuth's updateProfileInSheet, which calls fetchAllSheetData
      // and localProfiles will be updated by the useEffect listening to allUserProfiles.
    }
    setIsSaving(false);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeMessage('');
    if (!currentUser) {
      setPasswordChangeMessage('Error: Not logged in.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordChangeMessage('Error: New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) { 
        setPasswordChangeMessage('Error: New password must be at least 6 characters long.');
        return;
    }

    const passwordChangeSuccess = await changePassword(currentUser.id as User, oldPassword, newPassword);
    if (passwordChangeSuccess) {
      setPasswordChangeMessage('Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setPasswordChangeMessage('Error: Could not change password. Old password might be incorrect.');
    }
    setTimeout(() => setPasswordChangeMessage(''), 5000);
  };
  
  const isProfileFieldEditable = (userKeyForForm: User, field: keyof Omit<UserProfile, 'id' | 'name'>): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === UserRole.ADMIN) return true; 
    if (currentUser.role === UserRole.LIMITED && currentUser.id === userKeyForForm) {
        return field !== 'profitShare'; 
    }
    return false; 
  };

  const renderUserProfileForm = (userKey: User) => {
    // Use localProfiles for form values, as it reflects pending changes
    const profile = localProfiles[userKey] || DEFAULT_USER_PROFILES[userKey];

    return (
      <Card title={`${profile.name}'s Profile`} key={userKey} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Name"
            type="text"
            value={profile.name} 
            readOnly
            className="bg-gray-600 cursor-not-allowed" 
          />
          <Input
            label="Phone Number"
            type="tel"
            value={profile.phone}
            onChange={(e) => handleProfileInputChange(userKey, 'phone', e.target.value)}
            placeholder="Enter phone number"
            disabled={!isProfileFieldEditable(userKey, 'phone') || isSaving}
          />
          <Input
            label="Email Address"
            type="email"
            value={profile.email}
            onChange={(e) => handleProfileInputChange(userKey, 'email', e.target.value)}
            placeholder="Enter email address"
            disabled={!isProfileFieldEditable(userKey, 'email') || isSaving}
          />
          <Input
            label="Profile Picture URL"
            type="url"
            value={profile.profilePic}
            onChange={(e) => handleProfileInputChange(userKey, 'profilePic', e.target.value)}
            placeholder="https://example.com/image.png"
            disabled={!isProfileFieldEditable(userKey, 'profilePic') || isSaving}
          />
          {(currentUser?.role === UserRole.ADMIN) && (
            <Input
              label="Profit Share (%)"
              type="number"
              value={profile.profitShare?.toString() || "0"} 
              onChange={(e) => handleProfileInputChange(userKey, 'profitShare', e.target.value)} 
              min="0"
              max="100"
              step="0.01"
              required
              aria-required="true"
              disabled={!isProfileFieldEditable(userKey, 'profitShare') || isSaving}
            />
          )}
        </div>
        {profile.profilePic && (
          <div className="mt-4">
            <img 
                src={profile.profilePic} 
                alt={`${profile.name}'s profile`} 
                className="w-24 h-24 rounded-full object-cover mx-auto md:mx-0"
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; 
                    target.src = `https://via.placeholder.com/100/${userKey === User.YAZAN ? '007bff' : '28a745'}/FFFFFF?Text=${userKey.charAt(0)}`;
                }}
            />
          </div>
        )}
      </Card>
    );
  };

  if (authLoading && !currentUser) { // Show loading only if not already logged in and still loading auth state
    return <p className="text-center text-xl">Loading settings...</p>;
  }
  if (!currentUser) {
    return <p className="text-center text-xl">Please log in to view settings.</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-100">User Settings</h1>
      
      <form onSubmit={handleProfileSave}>
        {currentUser.role === UserRole.ADMIN && (
          <>
            {renderUserProfileForm(User.YAZAN)}
            {renderUserProfileForm(User.GHADEER)}
          </>
        )}
        {currentUser.role === UserRole.LIMITED && renderUserProfileForm(currentUser.id as User)}

      {saveMessage && (
          <p className={`my-4 text-sm ${saveMessage.includes('Error:') ? 'text-red-400' : 'text-green-400'}`} role="status" aria-live="polite">
            {saveMessage}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" isLoading={isSaving} disabled={isSaving || authLoading}>
            {isSaving ? 'Saving...' : 'Save Profile Settings'}
        </Button>
      </form>

      <Card title="Change Your Password" className="mt-10">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            label="Old Password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            disabled={isSaving || authLoading}
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={isSaving || authLoading}
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
            disabled={isSaving || authLoading}
          />
          {passwordChangeMessage && (
            <p className={`text-sm ${passwordChangeMessage.includes('Error:') ? 'text-red-400' : 'text-green-400'}`} role="status" aria-live="polite">
              {passwordChangeMessage}
            </p>
          )}
          <Button type="submit" variant="secondary" disabled={isSaving || authLoading}>Change Password</Button>
        </form>
      </Card>
    </div>
  );
};

export default SettingsPage;