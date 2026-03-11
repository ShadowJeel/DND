"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft, Building2, CheckCircle2, CreditCard, Factory, FileText, Loader2, Package, ShieldCheck, Upload, User, XCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { auth, storage } from "@/lib/firebase"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { logger } from "@/lib/logger"
import { useAuth } from "@/lib/auth-context"
import { Checkbox } from "@/components/ui/checkbox"
import { useEffect } from "react"

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verificationError, setVerificationError] = useState("")
  const [maskedAadhaar, setMaskedAadhaar] = useState("")
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedFilePath, setUploadedFilePath] = useState("")
  const [products, setProducts] = useState<{ id: string, name: string }[]>([])
  const [fetchingProducts, setFetchingProducts] = useState(false)
  const [gstDetails, setGstDetails] = useState<{
    gstin: string
    legalName?: string
    tradeName?: string
    status?: string
    registrationDate?: string
    type?: string
  } | null>(null)

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    company: "",
    role: "buyer" as "buyer" | "seller",
    entityType: "company" as "company" | "individual",
    aadhaarNumber: "",
    gstin: "",
    documentPath: "",
    selectedCategories: [] as string[],
  })

  useEffect(() => {
    const fetchCats = async () => {
      setFetchingProducts(true)
      try {
        const { getProducts } = await import("@/lib/store")
        const data = await getProducts()
        setProducts(data)
      } catch (err) {
        logger.error("Failed to fetch products for registration", { error: (err as Error).message })
      } finally {
        setFetchingProducts(false)
      }
    }
    fetchCats()
  }, [])

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    // Reset verification when user changes the verification input
    if (field === "gstin" || field === "aadhaarNumber") {
      setVerified(false)
      setVerificationError("")
      setGstDetails(null)
      setMaskedAadhaar("")
    }
  }

  // --- Aadhaar Verification (Buyer) ---
  const verifyAadhaar = async () => {
    if (!form.aadhaarNumber) {
      setVerificationError("Please enter your Aadhaar number")
      return
    }
    setVerifying(true)
    setVerificationError("")
    setVerified(false)
    try {
      const res = await fetch("/api/verify/aadhaar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaarNumber: form.aadhaarNumber }),
      })
      const data = await res.json()
      if (res.ok && data.valid) {
        setVerified(true)
        setMaskedAadhaar(data.masked)
        toast.success("Aadhaar verified successfully!")
      } else {
        setVerificationError(data.message || "Invalid Aadhaar number")
      }
    } catch {
      setVerificationError("Verification service unavailable. Please try again.")
    } finally {
      setVerifying(false)
    }
  }

  // --- GSTIN Verification (Seller) ---
  const verifyGstin = async () => {
    if (!form.gstin) {
      setVerificationError("Please enter your GSTIN")
      return
    }
    setVerifying(true)
    setVerificationError("")
    setVerified(false)
    setGstDetails(null)
    try {
      const res = await fetch("/api/verify/gstin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin: form.gstin }),
      })
      const data = await res.json()
      if (res.ok && data.valid) {
        setVerified(true)
        setGstDetails(data.details)
        toast.success("GSTIN verified successfully!")
      } else {
        setVerificationError(data.message || "Invalid GSTIN")
      }
    } catch {
      setVerificationError("Verification service unavailable. Please try again.")
    } finally {
      setVerifying(false)
    }
  }

  const handleSubmit = async () => {
    if (!verified) {
      toast.error(`Please verify your ${form.entityType === "company" ? "GSTIN" : "Aadhaar"} first`)
      return
    }
    if (!uploadedFilePath) {
      toast.error("Please upload the required document")
      return
    }
    setLoading(true)
    try {
      const { selectedCategories, ...payload } = form
      const success = await register({
        ...payload,
        verificationType: form.entityType === "company" ? "gst" : "aadhar",
        categories: form.role === "seller" ? form.selectedCategories : [],
      } as any)
      if (!success) {
        toast.error("Registration failed")
        return
      }
      toast.success("Account created successfully!")
      router.push("/dashboard")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = (role: string) => {
    setForm((prev) => ({ ...prev, role: role as "buyer" | "seller" }))
    // Reset all verification state when role changes
    setVerified(false)
    setVerificationError("")
    setGstDetails(null)
    setMaskedAadhaar("")
    setForm((prev) => ({ ...prev, selectedCategories: [] }))
  }

  const handleEntityTypeChange = (entityType: string) => {
    setForm((prev) => ({ ...prev, entityType: entityType as "company" | "individual" }))
    // Reset verification and upload state
    setVerified(false)
    setVerificationError("")
    setGstDetails(null)
    setMaskedAadhaar("")
    setUploadedFile(null)
    setUploadedFilePath("")
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Trigger file input click
  const handleChangeFile = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB")
      return
    }

    // Validate file type (Images only)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only image files (JPEG, JPG, PNG) are allowed")
      return
    }

    setUploadingFile(true)
    try {
      // Create unique file name
      const timestamp = Date.now()
      const sanitizedUserName = (form.name || "user").replace(/[^a-zA-Z0-9]/g, "_")
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `${sanitizedUserName}_${timestamp}.${fileExtension}`

      const storageRef = ref(storage, `documents/${fileName}`)
      const snapshot = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)

      setUploadedFile(file)
      setUploadedFilePath(downloadURL)
      setForm((prev) => ({ ...prev, documentPath: downloadURL }))
      toast.success("Document uploaded successfully!")

    } catch (error: any) {
      logger.error("Client side upload error", { error: error.message })
      toast.error("Failed to upload document. Please try again.")
    } finally {
      setUploadingFile(false)
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4 py-12"
      suppressHydrationWarning
    >
      <div className="w-full max-w-lg">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" suppressHydrationWarning /> Back to home
        </Link>
        <Card className="border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Factory className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="font-serif text-2xl text-foreground">Create your account</CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === 1
                ? "Select your role on the platform"
                : step === 2
                  ? "Register as a company or individual"
                  : step === 3
                    ? "Enter your personal details"
                    : step === 4
                      ? `Verify your ${form.entityType === "company" ? "GSTIN" : "Aadhaar"}`
                      : step === 5
                        ? "Upload verification document"
                        : "Select product categories"}
            </CardDescription>
            <div className="mt-4 flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                // Hide step 6 visually if not a seller
                (s < 6 || form.role === 'seller') && (
                  <div key={s} className={`h-2 w-8 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
                )
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {/* Step 1: Role Selection */}
            {step === 1 && (
              <div className="flex flex-col gap-6">
                <div>
                  <Label className="mb-3 block text-foreground">I want to register as</Label>
                  <RadioGroup value={form.role} onValueChange={handleRoleChange} className="flex flex-col gap-3">
                    {[
                      { value: "buyer", label: "Buyer", desc: "Create inquiries and receive competitive quotes", icon: CreditCard },
                      { value: "seller", label: "Seller", desc: "Browse inquiries and submit price offers", icon: Building2 },
                    ].map((opt) => (
                      <label key={opt.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${form.role === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                        <RadioGroupItem value={opt.value} className="mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <opt.icon className="h-4 w-4" />
                            {opt.label}
                          </div>
                          <div className="text-sm text-muted-foreground">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <Button className="w-full" onClick={() => setStep(2)}>Continue</Button>
              </div>
            )}

            {/* Step 2: Entity Type Selection */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <div>
                  <Label className="mb-3 block text-foreground">Register as</Label>
                  <RadioGroup value={form.entityType} onValueChange={handleEntityTypeChange} className="flex flex-col gap-3">
                    {[
                      { value: "company", label: "Company", desc: "Business entity with GSTIN registration", icon: Building2 },
                      { value: "individual", label: "Individual", desc: "Personal account with Aadhaar verification", icon: User },
                    ].map((opt) => (
                      <label key={opt.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${form.entityType === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                        <RadioGroupItem value={opt.value} className="mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <opt.icon className="h-4 w-4" />
                            {opt.label}
                          </div>
                          <div className="text-sm text-muted-foreground">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="flex items-center gap-2 text-sm text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {form.entityType === "company"
                      ? "Companies require GSTIN certificate image upload (JPEG/PNG, max 2MB)"
                      : "Individuals require Aadhaar card image upload (JPEG/PNG, max 2MB)"}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setStep(1)}>Back</Button>
                  <Button className="flex-1" onClick={() => setStep(3)}>Continue</Button>
                </div>
              </div>
            )}

            {/* Step 3: Personal/Company Details */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="name" className="text-foreground">
                    {form.entityType === "company" ? "Company Name" : "Your Name"}
                  </Label>
                  <Input
                    id="name"
                    placeholder={form.entityType === "company" ? "ABC Industries Pvt. Ltd." : "John Doe"}
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-foreground">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-foreground">
                    Contact Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    This number will be used for SMS and Email communication
                  </p>
                </div>
                <div>
                  <Label htmlFor="password" className="text-foreground">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={form.password}
                    onChange={(e) => updateForm("password", e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div className="flex gap-3 mt-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setStep(2)}>Back</Button>
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      if (!form.name || !form.email || !form.phone || !form.password) {
                        toast.error("Please fill in all required fields")
                        return
                      }
                      if (form.password.length < 8) {
                        toast.error("Password must be at least 8 characters")
                        return
                      }
                      setLoading(true)
                      try {
                        await createUserWithEmailAndPassword(auth, form.email, form.password)
                        setStep(4)
                      } catch (e: any) {
                        if (e.code === 'auth/email-already-in-use') {
                          // Email already exists! Proceed forward to the upload assuming they own it (or it will block them later).
                          // For security, if it's already in use, we shouldn't let them upload docs unless they log in. Let's show an error.
                          toast.error("This email is already registered. Please log in.")
                        } else {
                          toast.error(e.message || "Failed to create account")
                        }
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authenticating...</>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Verification - Based on Entity Type */}
            {step === 4 && (
              <div className="flex flex-col gap-5">
                {/* Company: GSTIN Verification */}
                {form.entityType === "company" && (
                  <>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Building2 className="h-4 w-4 text-primary" />
                        GSTIN Verification
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Verified against the Government GST Portal in real-time
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="gstin" className="text-foreground">GSTIN Number</Label>
                      <div className="mt-1.5 flex gap-2">
                        <Input
                          id="gstin"
                          placeholder="27AAPFU0939F1ZV"
                          maxLength={15}
                          value={form.gstin}
                          onChange={(e) => updateForm("gstin", e.target.value.toUpperCase())}
                          className={`flex-1 font-mono uppercase tracking-wider ${verified ? "border-green-500" : verificationError ? "border-destructive" : ""}`}
                          disabled={verifying}
                        />
                        <Button
                          onClick={verifyGstin}
                          disabled={verifying || verified || form.gstin.length !== 15}
                          className={verified ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {verifying ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying</>
                          ) : verified ? (
                            <><CheckCircle2 className="mr-2 h-4 w-4" /> Verified</>
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        15-character GSTIN (e.g. 27AAPFU0939F1ZV)
                      </p>
                    </div>

                    {verificationError && (
                      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <p className="text-sm text-destructive">{verificationError}</p>
                      </div>
                    )}

                    {verified && gstDetails && (
                      <div className="rounded-lg border border-green-500/30 bg-green-500/10 dark:bg-green-500/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          GSTIN Verified Successfully
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">GSTIN</span>
                            <p className="font-mono font-medium text-green-900 dark:text-green-100">{gstDetails.gstin}</p>
                          </div>
                          {gstDetails.legalName && (
                            <div>
                              <span className="text-muted-foreground">Legal Name</span>
                              <p className="font-medium text-green-900 dark:text-green-100">{gstDetails.legalName}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Individual: Aadhaar Verification */}
                {form.entityType === "individual" && (
                  <>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Aadhaar Card Verification
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Verified using the Government of India Verhoeff checksum algorithm (UIDAI standard)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="aadhaar" className="text-foreground">Aadhaar Number</Label>
                      <div className="mt-1.5 flex gap-2">
                        <Input
                          id="aadhaar"
                          placeholder="XXXX XXXX XXXX"
                          maxLength={14}
                          value={form.aadhaarNumber}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "").slice(0, 12)
                            const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ")
                            updateForm("aadhaarNumber", raw)
                            e.target.value = formatted
                          }}
                          className={`flex-1 font-mono tracking-wider ${verified ? "border-green-500" : verificationError ? "border-destructive" : ""}`}
                          disabled={verifying}
                        />
                        <Button
                          onClick={verifyAadhaar}
                          disabled={verifying || verified || form.aadhaarNumber.length !== 12}
                          className={verified ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {verifying ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying</>
                          ) : verified ? (
                            <><CheckCircle2 className="mr-2 h-4 w-4" /> Verified</>
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Enter your 12-digit Aadhaar number
                      </p>
                    </div>

                    {verificationError && (
                      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <p className="text-sm text-destructive">{verificationError}</p>
                      </div>
                    )}

                    {verified && maskedAadhaar && (
                      <div className="rounded-lg border border-green-500/30 bg-green-500/10 dark:bg-green-500/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Aadhaar Verified Successfully
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">Masked Number</span>
                          <p className="font-mono font-medium text-green-900 dark:text-green-100">{maskedAadhaar}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setStep(3)}>Back</Button>
                  <Button
                    className="flex-1"
                    onClick={() => setStep(5)}
                    disabled={!verified}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Document Upload */}
            {step === 5 && (
              <div className="flex flex-col gap-5">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    Upload {form.entityType === "company" ? "GSTIN Certificate" : "Aadhaar Card"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Image format (JPEG, PNG, JPG), maximum file size 2MB
                  </p>
                </div>

                <div>
                  <Label htmlFor="document" className="text-foreground">
                    {form.entityType === "company" ? "GSTIN Certificate" : "Aadhaar Card"} (Image)
                  </Label>
                  <div className="mt-1.5">
                    <div className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all ${uploadedFile ? "border-green-500 bg-green-500/10" : "border-border hover:border-primary/50"}`}>
                      <input
                        ref={fileInputRef}
                        id="document"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                      />
                      {uploadingFile ? (
                        <>
                          <Loader2 className="h-10 w-10 animate-spin text-primary" />
                          <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
                        </>
                      ) : uploadedFile ? (
                        <>
                          <CheckCircle2 className="h-10 w-10 text-green-600" />
                          <p className="mt-2 text-sm font-medium text-foreground">{uploadedFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={handleChangeFile}
                            type="button"
                          >
                            Change File
                          </Button>
                        </>
                      ) : (
                        <label
                          htmlFor="document"
                          className="flex cursor-pointer flex-col items-center"
                        >
                          <Upload className="h-10 w-10 text-muted-foreground" />
                          <p className="mt-2 text-sm font-medium text-foreground">Click to upload</p>
                          <p className="text-xs text-muted-foreground">JPEG, PNG, JPG only, max 2MB</p>
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setStep(4)}>Back</Button>
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      if (!uploadedFile) {
                        toast.error("Please upload the required document")
                        return
                      }
                      if (form.role === "seller") {
                        setStep(6)
                      } else {
                        await handleSubmit()
                      }
                    }}
                    disabled={!uploadedFile || uploadingFile || loading}
                  >
                    {form.role === "seller" ? "Continue" : loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing...</>
                    ) : (
                      "Complete Registration"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 6: Category Selection (Sellers Only) */}
            {step === 6 && form.role === "seller" && (
              <div className="flex flex-col gap-6">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Package className="h-4 w-4 text-primary" />
                    Product Categories
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Select at least one category you deal in. You will receive inquiries for these products.
                  </p>
                </div>

                <div className="grid gap-3 max-h-[300px] overflow-y-auto px-1">
                  {fetchingProducts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : products.map((product) => (
                    <div
                      key={product.id}
                      className={`flex items-start gap-3 rounded-lg border p-4 transition-all cursor-pointer ${form.selectedCategories.includes(product.name) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                      onClick={() => {
                        const current = form.selectedCategories
                        if (current.includes(product.name)) {
                          setForm(prev => ({ ...prev, selectedCategories: current.filter(c => c !== product.name) }))
                        } else {
                          setForm(prev => ({ ...prev, selectedCategories: [...current, product.name] }))
                        }
                      }}
                    >
                      <Checkbox
                        id={`cat-${product.id}`}
                        checked={form.selectedCategories.includes(product.name)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`cat-${product.id}`}
                          className="cursor-pointer text-sm font-medium text-foreground"
                        >
                          {product.name}
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setStep(5)}>Back</Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={loading || form.selectedCategories.length === 0}
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing...</>
                    ) : (
                      "Complete Registration"
                    )}
                  </Button>
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
