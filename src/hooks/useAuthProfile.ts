import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { authService, type UserRole } from '../services/authService';
import {
  profileService,
  type ConsentRecord,
  type PrivateContactData,
  type UserProfileData,
} from '../services/profileService';

const DEV_ROLE_KEY = 'lifedrop_dev_role_override_v1';

export function useAuthProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [privateContact, setPrivateContact] =
    useState<PrivateContactData | null>(null);
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [devRoleOverride, setDevRoleOverrideState] = useState<UserRole | null>(
    () => {
      try {
        const raw = localStorage.getItem(DEV_ROLE_KEY);
        if (
          raw === 'donor' ||
          raw === 'recipient' ||
          raw === 'bank' ||
          raw === 'admin'
        ) {
          return raw;
        }
      } catch {
        // Ignore storage error
      }
      return null;
    },
  );

  const loadProfileForUser = useCallback(async (uid: string, emailVerified: boolean) => {
    setProfileLoading(true);
    try {
      const [res, adminFlag] = await Promise.all([
        profileService.getUserProfile(uid),
        emailVerified ? profileService.checkIsAdmin(uid) : Promise.resolve(false),
      ]);
      setProfile(res.profile);
      setPrivateContact(res.privateContact);
      setConsent(res.consent);
      setIsAdminUser(adminFlag);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = authService.subscribeAuth((nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (nextUser) {
        void loadProfileForUser(nextUser.uid, Boolean(nextUser.emailVerified));
      } else {
        setProfile(null);
        setPrivateContact(null);
        setConsent(null);
        setIsAdminUser(false);
      }
    });
    return unsub;
  }, [loadProfileForUser]);

  const refreshUserAndProfile = useCallback(async () => {
    if (!user) return;
    try {
      await user.reload();
    } catch {
      // Ignore reload failure when offline
    }
    await loadProfileForUser(user.uid, Boolean(user.emailVerified));
  }, [user, loadProfileForUser]);

  const setDevRoleOverride = useCallback((role: UserRole | null) => {
    setDevRoleOverrideState(role);
    try {
      if (role) {
        localStorage.setItem(DEV_ROLE_KEY, role);
      } else {
        localStorage.removeItem(DEV_ROLE_KEY);
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggleCanDonate = useCallback(
    async (next: boolean) => {
      if (!profile) return;
      const updated = await profileService.updateCanDonateNow(profile, next);
      setProfile(updated);
    },
    [profile],
  );

  const logSelfDonation = useCallback(
    async (date: string, place: string) => {
      if (!profile) return null;
      const updated = await profileService.logSelfReportedDonation(
        profile,
        date,
        place,
      );
      setProfile(updated);
      return updated;
    },
    [profile],
  );

  const withdrawConsent = useCallback(async () => {
    if (!user) return;
    const updated = await profileService.withdrawConsent(user.uid, profile);
    if (updated) setProfile(updated);
    setConsent((prev) =>
      prev
        ? {
            ...prev,
            withdrawn: true,
            acceptedEmergencyAlerts: false,
            updatedAt: new Date().toISOString(),
          }
        : null,
    );
  }, [user, profile]);

  const signOut = useCallback(async () => {
    await authService.signOutUser();
    setProfile(null);
    setPrivateContact(null);
    setConsent(null);
    setIsAdminUser(false);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user) return;
    const uid = user.uid;
    await profileService.deleteAllUserData(uid);
    await authService.deleteCurrentAuthUser();
    setProfile(null);
    setPrivateContact(null);
    setConsent(null);
    setIsAdminUser(false);
  }, [user]);

  const effectiveRole: UserRole | null =
    devRoleOverride ?? (isAdminUser ? 'admin' : profile?.role ?? null);

  const needsOnboarding = Boolean(user && !profileLoading && !profile);

  return {
    user,
    authLoading,
    profileLoading,
    profile,
    privateContact,
    consent,
    isRealAdmin: isAdminUser,
    effectiveRole,
    devRoleOverride,
    needsOnboarding,
    setDevRoleOverride,
    setProfile,
    refreshUserAndProfile,
    toggleCanDonate,
    logSelfDonation,
    withdrawConsent,
    signOut,
    deleteAccount,
  };
}
