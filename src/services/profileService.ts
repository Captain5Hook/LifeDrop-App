import {
  deleteDoc,
  doc,
  getDoc,
  increment,
  runTransaction,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { BloodGroup } from '../data/seedStats';
import type { BiologicalSex } from './eligibilityService';
import type { UserRole } from './authService';
import { auth, db } from './firebase';

export type BloodGroupVerification = 'self-reported' | 'lab-confirmed';

export interface DonationTimelineItem {
  id: string;
  date: string;
  place: string;
  status: 'self-reported' | 'bank-confirmed';
  units: number;
}

export interface UserProfileData {
  uid: string;
  displayName: string;
  role: UserRole;
  bloodGroup: BloodGroup;
  bloodGroupStatus: BloodGroupVerification;
  stateCode: string;
  stateName: string;
  city: string;
  sex: BiologicalSex;
  canDonateNow: boolean;
  lastSelfReportedDonation: string | null;
  lastConfirmedDonation: string | null;
  donationsCount: number;
  timeline: DonationTimelineItem[];
  age18PlusConfirmed: boolean;
  consentTimestamp: string;
  statsCounted?: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrivateContactData {
  uid: string;
  email: string;
  phone: string;
  dobYear: number;
  updatedAt: string;
}

export interface ConsentRecord {
  uid: string;
  purpose: string;
  acceptedPrivacy: boolean;
  acceptedAge18Plus: boolean;
  acceptedEmergencyAlerts: boolean;
  withdrawn: boolean;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_PROFILE_PREFIX = 'lifedrop_profile_v1_';

class FirestoreProfileService {
  private getLocalKey(uid: string): string {
    return `${LOCAL_PROFILE_PREFIX}${uid}`;
  }

  getCachedProfile(uid: string): UserProfileData | null {
    try {
      const raw = localStorage.getItem(this.getLocalKey(uid));
      return raw ? (JSON.parse(raw) as UserProfileData) : null;
    } catch {
      return null;
    }
  }

  private setCachedProfile(profile: UserProfileData): void {
    try {
      localStorage.setItem(this.getLocalKey(profile.uid), JSON.stringify(profile));
    } catch {
      // Ignore storage error
    }
  }

  async getUserProfile(uid: string): Promise<{
    profile: UserProfileData | null;
    privateContact: PrivateContactData | null;
    consent: ConsentRecord | null;
  }> {
    const cached = this.getCachedProfile(uid);
    try {
      const [userSnap, contactSnap, consentSnap] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDoc(doc(db, 'users', uid, 'private', 'contact')),
        getDoc(doc(db, 'consents', uid)),
      ]);

      const profile = userSnap.exists()
        ? (userSnap.data() as UserProfileData)
        : cached;
      if (profile) this.setCachedProfile(profile);

      return {
        profile,
        privateContact: contactSnap.exists()
          ? (contactSnap.data() as PrivateContactData)
          : null,
        consent: consentSnap.exists()
          ? (consentSnap.data() as ConsentRecord)
          : null,
      };
    } catch {
      return {
        profile: cached,
        privateContact: null,
        consent: null,
      };
    }
  }

  async getEligibilityRules(): Promise<
    import('../config/eligibilityRules').EligibilityRulesConfig
  > {
    const { DEFAULT_ELIGIBILITY_RULES } = await import(
      '../config/eligibilityRules'
    );
    try {
      const snap = await getDoc(doc(db, 'config', 'eligibility'));
      if (snap.exists()) {
        return {
          ...DEFAULT_ELIGIBILITY_RULES,
          ...(snap.data() as Partial<
            import('../config/eligibilityRules').EligibilityRulesConfig
          >),
        };
      }
    } catch {
      // Fallback to default bundled rules when offline or unseeded
    }
    return DEFAULT_ELIGIBILITY_RULES;
  }

  async completeOnboarding(params: {
    uid: string;
    email: string;
    displayName: string;
    role: Exclude<UserRole, 'admin'>;
    bloodGroup: BloodGroup;
    stateCode: string;
    stateName: string;
    city: string;
    sex: BiologicalSex;
    phone: string;
    dobYear: number;
    acceptedEmergencyAlerts: boolean;
  }): Promise<UserProfileData> {
    const now = new Date().toISOString();
    const isAdminEmail =
      params.email.toLowerCase() === 'punithreddy9010@gmail.com';
    const resolvedRole: UserRole = isAdminEmail ? 'admin' : params.role;

    const existingCached = this.getCachedProfile(params.uid);

    const profile: UserProfileData = {
      uid: params.uid,
      displayName: params.displayName.trim().slice(0, 80) || 'LifeDrop Member',
      role: resolvedRole,
      bloodGroup: params.bloodGroup,
      bloodGroupStatus: existingCached?.bloodGroupStatus ?? 'self-reported',
      stateCode: params.stateCode,
      stateName: params.stateName,
      city: params.city.trim().slice(0, 80),
      sex: params.sex,
      canDonateNow: resolvedRole === 'donor',
      lastSelfReportedDonation: existingCached?.lastSelfReportedDonation ?? null,
      lastConfirmedDonation: existingCached?.lastConfirmedDonation ?? null,
      donationsCount: existingCached?.donationsCount ?? 0,
      timeline: existingCached?.timeline ?? [],
      age18PlusConfirmed: true,
      consentTimestamp: now,
      statsCounted: existingCached?.statsCounted ?? false,
      isDemo: false,
      createdAt: existingCached?.createdAt ?? now,
      updatedAt: now,
    };

    const privateContact: PrivateContactData = {
      uid: params.uid,
      email: params.email.slice(0, 140),
      phone: params.phone.trim().slice(0, 20),
      dobYear: params.dobYear,
      updatedAt: now,
    };

    const consent: ConsentRecord = {
      uid: params.uid,
      purpose:
        'Blood donor/recipient matching, voluntary availability alerts, and blood bank coordination under DPDP Act 2023.',
      acceptedPrivacy: true,
      acceptedAge18Plus: true,
      acceptedEmergencyAlerts: params.acceptedEmergencyAlerts,
      withdrawn: false,
      createdAt: existingCached?.createdAt ?? now,
      updatedAt: now,
    };

    this.setCachedProfile(profile);

    if (auth.currentUser && auth.currentUser.uid === params.uid) {
      await Promise.all([
        setDoc(doc(db, 'users', params.uid), {
          uid: profile.uid,
          displayName: profile.displayName,
          role: profile.role === 'admin' ? 'donor' : profile.role,
          bloodGroup: profile.bloodGroup,
          bloodGroupStatus: profile.bloodGroupStatus,
          stateCode: profile.stateCode,
          stateName: profile.stateName,
          city: profile.city,
          sex: profile.sex,
          canDonateNow: profile.canDonateNow,
          donationsCount: profile.donationsCount,
          timeline: profile.timeline.slice(0, 30),
          age18PlusConfirmed: true,
          consentTimestamp: now,
          isDemo: false,
          createdAt: profile.createdAt,
          updatedAt: now,
        }),
        setDoc(doc(db, 'users', params.uid, 'private', 'contact'), privateContact),
        setDoc(doc(db, 'consents', params.uid), consent),
      ]);

      if (!profile.statsCounted) {
        await this.incrementSignupStats(params.stateCode);
        profile.statsCounted = true;
        this.setCachedProfile(profile);
      }
    }

    return profile;
  }

  private async incrementSignupStats(stateCode: string): Promise<void> {
    const now = new Date().toISOString();
    try {
      await runTransaction(db, async (tx) => {
        const globalRef = doc(db, 'stats', 'global');
        const gSnap = await tx.get(globalRef);
        if (gSnap.exists()) {
          tx.update(globalRef, {
            totalUsers: increment(1),
            joinedToday: increment(1),
            updatedAt: now,
          });
        }
        if (stateCode && stateCode !== 'ALL') {
          const stRef = doc(db, 'stats', `state_${stateCode}`);
          const sSnap = await tx.get(stRef);
          if (sSnap.exists()) {
            tx.update(stRef, {
              totalUsers: increment(1),
              joinedToday: increment(1),
              updatedAt: now,
            });
          }
        }
      });
    } catch {
      // Stats documents may not be seeded yet or rules may reserve counters
    }
  }

  async updateCanDonateNow(
    profile: UserProfileData,
    canDonateNow: boolean,
  ): Promise<UserProfileData> {
    const updated: UserProfileData = {
      ...profile,
      canDonateNow,
      updatedAt: new Date().toISOString(),
    };
    this.setCachedProfile(updated);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        canDonateNow,
        updatedAt: updated.updatedAt,
      });
    } catch {
      // Saved locally when offline
    }
    return updated;
  }

  async logSelfReportedDonation(
    profile: UserProfileData,
    date: string,
    place: string,
  ): Promise<UserProfileData> {
    const entry: DonationTimelineItem = {
      id: `don_${Date.now()}`,
      date,
      place: place.trim().slice(0, 100) || 'Verified Blood Centre',
      status: 'self-reported',
      units: 1,
    };

    // Note: Per Section 9, next eligible date moves only after bank confirms donation
    const updatedTimeline = [entry, ...profile.timeline].slice(0, 30);
    const updated: UserProfileData = {
      ...profile,
      lastSelfReportedDonation: date,
      donationsCount: profile.donationsCount + 1,
      timeline: updatedTimeline,
      updatedAt: new Date().toISOString(),
    };
    this.setCachedProfile(updated);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        donationsCount: updated.donationsCount,
        lastSelfReportedDonation: date,
        timeline: updatedTimeline,
        updatedAt: updated.updatedAt,
      });
    } catch {
      // Saved locally when offline
    }
    return updated;
  }

  async withdrawConsent(
    uid: string,
    profile: UserProfileData | null,
  ): Promise<UserProfileData | null> {
    const now = new Date().toISOString();
    const updatedProfile = profile
      ? { ...profile, canDonateNow: false, updatedAt: now }
      : null;
    if (updatedProfile) {
      this.setCachedProfile(updatedProfile);
    }

    await Promise.allSettled([
      updateDoc(doc(db, 'consents', uid), {
        withdrawn: true,
        acceptedEmergencyAlerts: false,
        updatedAt: now,
      }),
      updateDoc(doc(db, 'users', uid), {
        canDonateNow: false,
        updatedAt: now,
      }),
    ]);

    return updatedProfile;
  }

  async exportUserData(uid: string): Promise<string> {
    const data = await this.getUserProfile(uid);
    const locationRaw = localStorage.getItem('lifedrop_location_v1');
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        act: 'DPDP Act 2023 User Data Export',
        profile: data.profile,
        privateContact: data.privateContact,
        consent: data.consent,
        savedLocation: locationRaw ? JSON.parse(locationRaw) : null,
      },
      null,
      2,
    );
  }

  async deleteAllUserData(uid: string): Promise<void> {
    try {
      localStorage.removeItem(this.getLocalKey(uid));
      localStorage.removeItem('lifedrop_location_v1');
    } catch {
      // Ignore
    }

    await Promise.allSettled([
      deleteDoc(doc(db, 'users', uid, 'private', 'contact')),
      deleteDoc(doc(db, 'consents', uid)),
      deleteDoc(doc(db, 'users', uid)),
    ]);
  }
}

export const profileService = new FirestoreProfileService();
