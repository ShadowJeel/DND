"use client"

import { logger } from "@/lib/logger"
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { auth } from "./firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { registerUser, loginUser as storeLoginUser, loginUserWithGoogle as storeLoginUserWithGoogle, connectUserWithGoogle as storeConnectUserWithGoogle } from "./store"

interface AuthUser {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  role: "buyer" | "seller" | "both"
  entityType: "company" | "individual"
  verificationType: "gst" | "aadhar"
  displayName: string
  userCode: string
  gstCertificateName?: string
  verified: boolean
  googleConnected: boolean
  createdAt: string;
  categories?: string[]
  productManufacturers?: Record<string, string[]>
  sellerProductOptions?: Record<string, Record<string, any>>
  availableLocations?: Record<string, string[]>
  smsNotificationsEnabled: boolean;
  secondaryEmails?: string[];
  notificationEmails?: string[];
  verifiedSecondaryEmails?: string[];
}

interface AuthContextType {
  user: AuthUser | null
  allUsers: AuthUser[]
  login: (email: string, password: string, role?: "buyer" | "seller") => Promise<boolean>
  loginWithGoogle: (email: string) => Promise<boolean>
  connectGoogle: (email: string) => Promise<boolean>
  register: (data: Record<string, string> | FormData) => Promise<boolean>
  logout: () => Promise<void>
  logoutAll: () => Promise<void>
  switchUser: (userId: string) => void
  updateUserData: (userData: Partial<AuthUser>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)
const AUTH_STORAGE_KEY = "dnd_purchase_users"
const ACTIVE_USER_KEY = "dnd_purchase_active_user"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [allUsers, setAllUsers] = useState<AuthUser[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Load users from localStorage on mount
  useEffect(() => {
    try {
      const storedUsers = localStorage.getItem(AUTH_STORAGE_KEY)
      const activeUserId = localStorage.getItem(ACTIVE_USER_KEY)

      if (storedUsers) {
        const users: AuthUser[] = JSON.parse(storedUsers)
        setAllUsers(users)

        if (activeUserId) {
          const activeUser = users.find(u => u.id === activeUserId)
          if (activeUser) {
            setUser(activeUser)
          } else if (users.length > 0) {
            setUser(users[0])
          }
        } else if (users.length > 0) {
          setUser(users[0])
        }
      }
    } catch (error) {
      logger.error("Failed to load users from storage", { error: (error as Error)?.message })
    } finally {
      setIsInitialized(true)
    }
  }, [])

  // Save users to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized) return

    try {
      if (allUsers.length > 0) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(allUsers))
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }

      if (user) {
        localStorage.setItem(ACTIVE_USER_KEY, user.id)
      } else {
        localStorage.removeItem(ACTIVE_USER_KEY)
      }
    } catch (error) {
      logger.error("Failed to save users to storage", { error: (error as Error)?.message })
    }
  }, [allUsers, user, isInitialized])

  const login = useCallback(async (email: string, password: string, role?: "buyer" | "seller") => {
    try {
      // 1. Authenticate natively in the browser first
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e: any) {
      logger.error("Client Firebase auth failed", { error: e.message })
      return false
    }

    // 2. Fetch the rich user profile & trigger backend routines (Email/SMS)
    let userDatas: AuthUser[];
    try {
      userDatas = await storeLoginUser(email, password, role) as any
      if (!userDatas || userDatas.length === 0) {
        return false
      }
    } catch (e: any) {
      logger.error("Native Firestore profile query failed", { error: e.message })
      return false
    }

    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userDatas[0].phone, email: userDatas[0].email, name: userDatas[0].name }),
      })
    } catch (e) {
      // Notification error (Email/SMS)
    }

    // Update allUsers and set current user
    setAllUsers(prev => {
      let updatedUsers = [...prev]
      for (const userData of userDatas) {
        const existingIndex = updatedUsers.findIndex(u => u.id === userData.id)
        if (existingIndex >= 0) {
          updatedUsers[existingIndex] = userData
        } else {
          updatedUsers.push(userData)
        }
      }

      // Set the newly logged in user as active
      const buyerUser = userDatas.find(u => u.role === "buyer" || u.role === "both") || userDatas[0]
      setUser(buyerUser)

      return updatedUsers
    })

    return true
  }, [])

  const register = useCallback(async (data: Record<string, string> | FormData) => {
    const isFormData = typeof FormData !== "undefined" && data instanceof FormData

    const payload: any = isFormData ? Object.fromEntries((data as FormData).entries()) : data

    // Extract credentials for native firebase layer
    const email = payload.email
    const password = payload.password

    try {
      // 1. Register natively in the browser first
      if (!auth.currentUser || auth.currentUser.email?.toLowerCase() !== email.toLowerCase()) {
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (e: any) {
      logger.error("Client Firebase auth registration failed", { error: e.message })
      // If it's email-already-in-use, it might already exist in standard backend DB or Firebase.
      // We will let the frontend UI handle this gracefully by returning false.
      if (e.code === 'auth/email-already-in-use') {
        // Do not block if we merely want to merge, but typically email-in-use is a hard stop
        return false
      }
      return false
    }

    let userDatas: AuthUser[];
    try {
      // 2. Natively create Firestore Profile
      userDatas = await registerUser({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
        company: payload.company || payload.name,
        role: payload.role as "buyer" | "seller" | "both",
        entityType: payload.entityType as "company" | "individual" | "both",
        verificationType: payload.verificationType as "gst" | "aadhar" | "both",
        gstin: (payload.entityType === "company" || payload.entityType === "both") ? payload.gstin : undefined,
        gstCertificatePath: (payload.entityType === "company" || payload.entityType === "both") ? payload.documentPath : undefined,
        aadhaarNumber: (payload.entityType === "individual" || payload.entityType === "both") ? payload.aadhaarNumber : undefined,
        aadhaarDocumentPath: (payload.entityType === "individual" || payload.entityType === "both") ? payload.documentPath : undefined,
        googleConnected: false,
        categories: payload.categories
          ? (typeof payload.categories === 'string' ? JSON.parse(payload.categories) : payload.categories)
          : undefined,
        smsNotificationsEnabled: true,
      } as any) as any
    } catch (e: any) {
      logger.error("Native Firestore profile creation failed", { error: e.message })
      return false
    }

    try {
      // 3. Ping backend for Email and SMS Welcome Notification
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userDatas[0].phone, email: userDatas[0].email, name: userDatas[0].name }),
      })
    } catch (e) {
      // Background process, not critical to block UI
    }

    // Add new user to allUsers and set as active
    setAllUsers(prev => {
      const updated = [...prev, ...userDatas]
      const buyerUser = userDatas.find(u => u.role === "buyer" || u.role === "both") || userDatas[0]
      setUser(buyerUser)
      return updated
    })

    return true
  }, [])

  const loginWithGoogle = useCallback(async (email: string) => {
    try {
      const datas = await storeLoginUserWithGoogle(email) as any[]
      if (!datas || datas.length === 0) return false

      setAllUsers(prev => {
        let updatedUsers = [...prev]
        for (const data of datas) {
          const existingIndex = updatedUsers.findIndex(u => u.id === data.id)
          if (existingIndex >= 0) {
            updatedUsers[existingIndex] = data
          } else {
            updatedUsers.push(data)
          }
        }

        const buyerUser = datas.find(u => u.role === "buyer" || u.role === "both") || datas[0]
        setUser(buyerUser)
        return updatedUsers
      })

      return true
    } catch (e: any) {
      logger.error("Native Google login failed", { error: e.message })
      return false
    }
  }, [])

  const connectGoogle = useCallback(async (email: string) => {
    if (!user) return false;

    try {
      const success = await storeConnectUserWithGoogle(user.id, email)
      if (!success) return false

      // Update active user state and all roles sharing the same email to reflect google connection
      const updated = { ...user, googleConnected: true }
      setUser(updated)
      setAllUsers(prev => prev.map(u => u.email === user.email ? { ...u, googleConnected: true } : u))

      return true
    } catch (e: any) {
      logger.error("Native Google connect failed", { error: e.message })
      return false
    }
  }, [user])

  const logout = useCallback(async () => {
    if (!user) return

    try {
      await auth.signOut()
    } catch (e: any) {
      logger.error("Firebase Auth sign out failed", { error: e.message })
    }

    // Remove all users with the same email from allUsers and switch to another if available
    setAllUsers(prev => {
      const remainingUsers = prev.filter(u => u.email !== user.email)

      // Switch to first remaining user or set to null
      if (remainingUsers.length > 0) {
        setUser(remainingUsers[0])
      } else {
        setUser(null)
      }

      return remainingUsers
    })
  }, [user])

  const logoutAll = useCallback(async () => {
    try {
      await auth.signOut()
    } catch (e: any) {
      logger.error("Firebase Auth sign out all failed", { error: e.message })
    }
    setAllUsers([])
    setUser(null)
  }, [])

  const switchUser = useCallback((userId: string) => {
    setAllUsers(prev => {
      const targetUser = prev.find(u => u.id === userId)
      if (targetUser) {
        setUser(targetUser)
      }
      return prev
    })
  }, [])

  const updateUserData = useCallback((userData: Partial<AuthUser>) => {
    setUser((prevUser) => {
      if (!prevUser) return null
      const updated = { ...prevUser, ...userData }

      // Also update in allUsers
      setAllUsers(prev =>
        prev.map(u => u.id === prevUser.id ? updated : u)
      )

      return updated
    })
  }, [])

  // Show loading state while initializing
  if (!isInitialized) {
    return null
  }

  return (
    <AuthContext
      value={{
        user,
        allUsers,
        login,
        loginWithGoogle,
        connectGoogle,
        register,
        logout,
        logoutAll,
        switchUser,
        updateUserData
      }}
    >
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
