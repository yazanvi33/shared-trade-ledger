
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthUser, User, UserProfile, UserRole, UserProfiles as AllUserProfilesContextType } from '../types'; 
import { verifyPasswordSync, hashPasswordSync } from '../utils/authUtils'; 
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS, DEFAULT_USER_PROFILES, USER_PROFILES_SHEET_NAME } from '../constants';
import { fetchDataFromSheet, updateDataInSheet } from '../services/googleSheetsService';

const LOGGED_IN_USER_ID_KEY = 'loggedInUserId';

interface CurrentAuthUser extends Omit<UserProfile, 'passwordHash'> { 
  username: string; 
  role: UserRole;   
}


interface AuthContextType {
  currentUser: CurrentAuthUser | null;
  isLoading: boolean;
  login: (identifier: string, passwordStr: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (userId: User, oldPasswordStr: string, newPasswordStr: string) => Promise<boolean>;
  isAuthenticated: boolean;
  allUserProfiles: AllUserProfilesContextType; 
  fetchAllSheetData: (loggedInUserIdOnLoad?: User | null) => Promise<void>; 
  updateProfileInSheet: (profileData: UserProfile) => Promise<boolean>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [allUserProfiles, setAllUserProfiles] = useState<AllUserProfilesContextType>(DEFAULT_USER_PROFILES);
  const navigate = useNavigate();

  const constructCurrentAuthUser = useCallback((profile: UserProfile): CurrentAuthUser => {
    const role = profile.id === User.YAZAN ? UserRole.ADMIN : UserRole.LIMITED;
    return {
      ...profile, 
      username: profile.name, 
      role: role,
    };
  }, []);

  const fetchAllSheetData = useCallback(async (loggedInUserIdOnLoad?: User | null) => {
    setIsLoading(true);
    try {
      const { userProfiles: fetchedProfilesFromSheet } = await fetchDataFromSheet();
      
      const updatedProfilesMap: AllUserProfilesContextType = {...DEFAULT_USER_PROFILES}; 
      if (fetchedProfilesFromSheet && fetchedProfilesFromSheet.length > 0) {
        fetchedProfilesFromSheet.forEach(pFS => { 
             updatedProfilesMap[pFS.id] = { ...DEFAULT_USER_PROFILES[pFS.id], ...pFS };
        });
      }
      setAllUserProfiles(updatedProfilesMap);
      

      if (loggedInUserIdOnLoad && updatedProfilesMap[loggedInUserIdOnLoad]) {
        setCurrentUser(constructCurrentAuthUser(updatedProfilesMap[loggedInUserIdOnLoad]));
      } else if (!loggedInUserIdOnLoad) { 
         setCurrentUser(null);
      }
    } catch (error) {
      console.error("[Auth] Failed to fetch sheet data for profiles:", error);
      setCurrentUser(null);
      localStorage.removeItem(LOGGED_IN_USER_ID_KEY);
    } finally {
      setIsLoading(false);
    }
  }, [constructCurrentAuthUser]);


  useEffect(() => {
    const storedUserId = localStorage.getItem(LOGGED_IN_USER_ID_KEY) as User | null;
    if (storedUserId) {
      fetchAllSheetData(storedUserId); 
    } else {
      fetchAllSheetData(null); 
    }
  }, [fetchAllSheetData]);


  const login = useCallback(async (identifier: string, passwordStr: string): Promise<boolean> => {
    setIsLoading(true);
    
    
    let foundProfile: UserProfile | undefined = undefined;

    for (const key in allUserProfiles) {
        const profile = allUserProfiles[key as User];
        if (
            profile.name.toLowerCase() === identifier.toLowerCase() ||
            profile.id.toLowerCase() === identifier.toLowerCase() || 
            profile.email.toLowerCase() === identifier.toLowerCase() ||
            profile.phone === identifier
        ) {
            foundProfile = profile;
            break;
        }
    }

    
    
    if (foundProfile) {
        
        const inputPasswordHash = hashPasswordSync(passwordStr);
        
        const verificationResult = verifyPasswordSync(passwordStr, foundProfile.passwordHash || ""); // Use empty string if hash is undefined/null
        

        if (foundProfile.passwordHash && verificationResult) {
            setCurrentUser(constructCurrentAuthUser(foundProfile));
            localStorage.setItem(LOGGED_IN_USER_ID_KEY, foundProfile.id); 
            setIsLoading(false);
            
            return true;
        }
    }
    
    setCurrentUser(null);
    localStorage.removeItem(LOGGED_IN_USER_ID_KEY);
    setIsLoading(false);
    
    return false;
  }, [allUserProfiles, constructCurrentAuthUser]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(LOGGED_IN_USER_ID_KEY);
    navigate(ROUTE_PATHS.LOGIN);
  }, [navigate]);

  const changePassword = useCallback(async (userId: User, oldPasswordStr: string, newPasswordStr: string): Promise<boolean> => {
    const userProfileToUpdate = allUserProfiles[userId];
    if (userProfileToUpdate && verifyPasswordSync(oldPasswordStr, userProfileToUpdate.passwordHash || "")) {
      const newPasswordHash = hashPasswordSync(newPasswordStr);
      const updatedProfile: UserProfile = { ...userProfileToUpdate, passwordHash: newPasswordHash };
      
      const success = await updateDataInSheet(USER_PROFILES_SHEET_NAME, updatedProfile);
      if (success) {
        setAllUserProfiles(prev => ({ ...prev, [userId]: updatedProfile }));
        // If the current user changed their own password, update currentUser state as well
        if (currentUser && currentUser.id === userId) {
            setCurrentUser(constructCurrentAuthUser(updatedProfile));
        }
        return true;
      }
    }
    return false;
  }, [allUserProfiles, currentUser, constructCurrentAuthUser]);

  const updateProfileInSheet = useCallback(async (profileData: UserProfile): Promise<boolean> => {
    const success = await updateDataInSheet(USER_PROFILES_SHEET_NAME, profileData);
    if (success) {
      // Re-fetch all data to ensure consistency and update allUserProfiles and currentUser
      const currentLoggedInUserId = localStorage.getItem(LOGGED_IN_USER_ID_KEY) as User | null;
      await fetchAllSheetData(currentLoggedInUserId);
    }
    return !!success; // Ensure boolean return
  }, [fetchAllSheetData]);


  const isAuthenticated = !!currentUser;

  const contextValue = {
    currentUser,
    isLoading,
    login,
    logout,
    changePassword,
    isAuthenticated,
    allUserProfiles,
    fetchAllSheetData,
    updateProfileInSheet,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
