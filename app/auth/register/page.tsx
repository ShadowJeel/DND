"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft, Building2, CheckCircle2, CreditCard, Factory, FileText, Loader2, Package, ShieldCheck, Upload, User, XCircle, Eye, EyeOff } from "lucide-react"
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
  const [showPassword, setShowPassword] = useState(false)

  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedFilePath, setUploadedFilePath] = useState("")
  const [uploadingAadhaar, setUploadingAadhaar] = useState(false)
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null)
  const [aadhaarFilePath, setAadhaarFilePath] = useState("")
  const aadhaarInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    company: "",
    role: "buyer" as "buyer" | "seller" | "both",
    entityType: "company" as "company" | "individual" | "both",
    aadhaarNumber: "",
    gstin: "",
    documentPath: "",
    aadhaarDocumentPath: "",
    selectedCategories: [] as string[],
    productManufacturers: {} as Record<string, string[]>,
  })

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))

  }



  const handleSubmit = async () => {
    if (!uploadedFilePath) {
      toast.error("Please upload the required document")
      return
    }
    setLoading(true)
    try {
      const { selectedCategories, ...payload } = form
      let verificationType = form.entityType === "company" ? "gst" : form.entityType === "individual" ? "aadhar" : "both"
      const success = await register({
        ...payload,
        verificationType,
        categories: (form.role === "seller" || form.role === "both") ? form.selectedCategories : [],
        productManufacturers: (form.role === "seller" || form.role === "both") ? form.productManufacturers : {},
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
    setForm((prev) => ({ ...prev, role: role as "buyer" | "seller" | "both" }))
    setForm((prev) => ({ ...prev, selectedCategories: [] }))
  }

  const handleEntityTypeChange = (entityType: string) => {
    setForm((prev) => ({ ...prev, entityType: entityType as "company" | "individual" | "both" }))
    // Reset upload state
    setUploadedFile(null)
    setUploadedFilePath("")
    setAadhaarFile(null)
    setAadhaarFilePath("")
    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (aadhaarInputRef.current) aadhaarInputRef.current.value = ""
  }

  // Trigger file input click
  const handleChangeFile = (e: React.MouseEvent, type: "document" | "aadhaar" = "document") => {
    e.preventDefault()
    e.stopPropagation()
    if (type === "document" && fileInputRef.current) {
      fileInputRef.current.click()
    } else if (type === "aadhaar" && aadhaarInputRef.current) {
      aadhaarInputRef.current.click()
    }
  }

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "document" | "aadhaar" = "document") => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB")
      return
    }

    // Validate file type (Images and PDF only)
    const isValidType = file.type.startsWith("image/") || file.type === "application/pdf"
    if (!isValidType) {
      toast.error("Only image files and PDFs are allowed")
      return
    }

    if (type === "document") setUploadingFile(true)
    else setUploadingAadhaar(true)

    try {
      // Create unique file name
      const timestamp = Date.now()
      const sanitizedUserName = (form.name || "user").replace(/[^a-zA-Z0-9]/g, "_")
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const docPrefix = type === "document" ? "doc" : "aadhaar"
      const fileName = `${sanitizedUserName}_${docPrefix}_${timestamp}.${fileExtension}`

      const storageRef = ref(storage, `documents/${fileName}`)
      const snapshot = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)

      if (type === "document") {
        setUploadedFile(file)
        setUploadedFilePath(fileName)
        setForm((prev) => ({ ...prev, documentPath: fileName }))
        toast.success("Document uploaded successfully!")
      } else {
        setAadhaarFile(file)
        setAadhaarFilePath(fileName)
        setForm((prev) => ({ ...prev, aadhaarDocumentPath: fileName }))
        toast.success("Aadhaar uploaded successfully!")
      }

    } catch (error: any) {
      logger.error("Client side upload error", { error: error.message })
      toast.error("Failed to upload document. Please try again.")
    } finally {
      if (type === "document") setUploadingFile(false)
      else setUploadingAadhaar(false)
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center  px-4 py-12"
      suppressHydrationWarning
    >
      <div className="w-full max-w-lg">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" suppressHydrationWarning /> Back to home
        </Link>
        <Card className="card-glossy">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex items-center justify-center">
              <img src="/logo-asset-4.png" alt="DND Purchase" className="h-14 md:h-16 w-auto object-contain" />
            </div>
            <CardTitle className="text-2xl text-foreground font-bold tracking-tight text-metallic">Create your account</CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === 1
                ? "Select your role on the platform"
                : step === 2
                  ? "Register as a company or individual"
                  : step === 3
                    ? "Enter your personal details"
                    : step === 4
                      ? (form.entityType === "company" ? "Enter GSTIN & Upload Certificate" : "Enter Aadhaar & Upload Document")
                      : "Enter GSTIN & Upload Certificate"}
            </CardDescription>
            <div className="mt-4 flex items-center justify-center gap-2">
              {Array.from({ length: form.entityType === "both" ? 5 : 4 }, (_, i) => i + 1).map((s) => (
                <div key={s} className={`h-2 w-8 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
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
                      { value: "both", label: "Both (Buyer & Seller)", desc: "Create inquiries and submit offers", icon: Package },
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
                <Button className="w-full" onClick={() => {
                  if (form.role === "both") {
                    setForm(prev => ({ ...prev, entityType: "both" }))
                    setStep(3)
                  } else {
                    if (form.entityType === "both") setForm(prev => ({ ...prev, entityType: "company" }))
                    setStep(2)
                  }
                }}>Continue</Button>
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
                      ? "Companies require GSTIN certificate upload (Image/PDF, max 10MB)"
                      : "Individuals require Aadhaar card upload (Image/PDF, max 10MB)"}
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
                {(form.entityType === "individual" || form.entityType === "both") && (
                  <div>
                    <Label htmlFor="name" className="text-foreground">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                )}
                {(form.entityType === "company" || form.entityType === "both") && (
                  <div>
                    <Label htmlFor="company" className="text-foreground">Company Name</Label>
                    <Input
                      id="company"
                      placeholder="ABC Industries Pvt. Ltd."
                      value={form.company}
                      onChange={(e) => updateForm("company", e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="email" className="text-foreground">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value.toLowerCase())}
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
                  {/* 
                  <p className="mt-1 text-xs text-muted-foreground">
                    This number will be used for SMS and Email communication
                  </p>
                  */}
                </div>
                <div>
                  <Label htmlFor="password" className="text-foreground">Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={form.password}
                      onChange={(e) => updateForm("password", e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                </div>
                <div className="flex gap-3 mt-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => {
                    if (form.role === "both") setStep(1)
                    else setStep(2)
                  }}>Back</Button>
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      if (!form.email.toLowerCase().endsWith("@gmail.com")) {
                        toast.error("Only Gmail addresses (@gmail.com) are allowed for registration")
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

            {/* Step 4: Verification & Document Upload (Aadhaar for Individual/Both, GST for Company) */}
            {step === 4 && (
              <div className="flex flex-col gap-5">
                {/* Company Only: GSTIN (because both moves to step 5) */}
                {form.entityType === "company" && (
                  <>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Building2 className="h-4 w-4 text-primary" />
                        GSTIN Details
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Provide your 15-character GSTIN
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
                          className="flex-1 font-mono uppercase tracking-wider"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Individual & Both: Aadhaar Details */}
                {(form.entityType === "individual" || form.entityType === "both") && (
                  <>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Aadhaar Details
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Provide your 12-digit Aadhaar number
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
                          className="flex-1 font-mono tracking-wider"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Document Upload for Step 4 */}
                {(form.entityType === "company" || form.entityType === "individual") && (
                  <div>
                    <Label htmlFor="document" className="text-foreground">
                      {form.entityType === "company" ? "GSTIN Certificate" : "Aadhaar Card"} (Image or PDF)
                    </Label>
                    <div className="mt-1.5">
                      <div className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all ${uploadedFile ? "border-green-500 bg-green-500/10" : "border-border hover:border-primary/50"}`}>
                        <input
                          ref={fileInputRef}
                          id="document"
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "document")}
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
                              onClick={(e) => handleChangeFile(e, "document")}
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
                            <p className="text-xs text-muted-foreground">Image or PDF only, max 10MB</p>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Area 2: Aadhaar (For "both", kept on Step 4) */}
                {form.entityType === "both" && (
                  <div>
                    <Label htmlFor="aadhaarDocument" className="text-foreground">
                      Aadhaar Card (Image or PDF)
                    </Label>
                    <div className="mt-1.5">
                      <div className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all ${aadhaarFile ? "border-green-500 bg-green-500/10" : "border-border hover:border-primary/50"}`}>
                        <input
                          ref={aadhaarInputRef}
                          id="aadhaarDocument"
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, "aadhaar")}
                          disabled={uploadingAadhaar}
                        />
                        {uploadingAadhaar ? (
                          <>
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
                          </>
                        ) : aadhaarFile ? (
                          <>
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                            <p className="mt-2 text-sm font-medium text-foreground">{aadhaarFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(aadhaarFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              onClick={(e) => handleChangeFile(e, "aadhaar")}
                              type="button"
                            >
                              Change File
                            </Button>
                          </>
                        ) : (
                          <label
                            htmlFor="aadhaarDocument"
                            className="flex cursor-pointer flex-col items-center"
                          >
                            <Upload className="h-10 w-10 text-muted-foreground" />
                            <p className="mt-2 text-sm font-medium text-foreground">Click to upload</p>
                            <p className="text-xs text-muted-foreground">Image or PDF only, max 10MB</p>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setStep(3)}>Back</Button>
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      if ((form.entityType === "individual" || form.entityType === "both") && form.aadhaarNumber.length !== 12) {
                        toast.error("Please enter a valid 12-digit Aadhaar number")
                        return
                      }

                      if (form.entityType === "both") {
                        if (!aadhaarFile || !aadhaarFilePath) {
                          toast.error("Please upload your Aadhaar document")
                          return
                        }
                        // Move to Step 5
                        setStep(5)
                      } else {
                        if (form.entityType === "company" && form.gstin.length !== 15) {
                          toast.error("Please enter a valid 15-character GSTIN")
                          return
                        }
                        if (!uploadedFile || !uploadedFilePath) {
                          toast.error("Please upload the required primary document")
                          return
                        }
                        await handleSubmit()
                      }
                    }}
                    disabled={
                      (form.entityType === "both" && (!aadhaarFile || uploadingAadhaar || form.aadhaarNumber.length !== 12)) ||
                      (form.entityType === "company" && (!uploadedFile || uploadingFile || form.gstin.length !== 15 || loading)) ||
                      (form.entityType === "individual" && (!uploadedFile || uploadingFile || form.aadhaarNumber.length !== 12 || loading))
                    }
                  >
                    {form.entityType === "both" ? "Continue To GST" : (loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing...</> : "Complete Registration")}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: GST Upload (Only for "Both") */}
            {step === 5 && form.entityType === "both" && (
              <div className="flex flex-col gap-5">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Building2 className="h-4 w-4 text-primary" />
                    GSTIN Details
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Provide your 15-character GSTIN
                  </p>
                </div>

                <div>
                  <Label htmlFor="gstin_both" className="text-foreground">GSTIN Number</Label>
                  <div className="mt-1.5 flex gap-2">
                    <Input
                      id="gstin_both"
                      placeholder="27AAPFU0939F1ZV"
                      maxLength={15}
                      value={form.gstin}
                      onChange={(e) => updateForm("gstin", e.target.value.toUpperCase())}
                      className="flex-1 font-mono uppercase tracking-wider"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="document_both" className="text-foreground">
                    GSTIN Certificate (Image or PDF)
                  </Label>
                  <div className="mt-1.5">
                    <div className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all ${uploadedFile ? "border-green-500 bg-green-500/10" : "border-border hover:border-primary/50"}`}>
                      <input
                        ref={fileInputRef}
                        id="document_both"
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "document")}
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
                            onClick={(e) => handleChangeFile(e, "document")}
                            type="button"
                          >
                            Change File
                          </Button>
                        </>
                      ) : (
                        <label
                          htmlFor="document_both"
                          className="flex cursor-pointer flex-col items-center"
                        >
                          <Upload className="h-10 w-10 text-muted-foreground" />
                          <p className="mt-2 text-sm font-medium text-foreground">Click to upload</p>
                          <p className="text-xs text-muted-foreground">Image or PDF only, max 10MB</p>
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setStep(4)}>Back</Button>
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      if (form.gstin.length !== 15) {
                        toast.error("Please enter a valid 15-character GSTIN")
                        return
                      }
                      if (!uploadedFile || !uploadedFilePath) {
                        toast.error("Please upload the required GSTIN document")
                        return
                      }
                      await handleSubmit()
                    }}
                    disabled={
                      !uploadedFile ||
                      uploadingFile ||
                      loading ||
                      form.gstin.length !== 15
                    }
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
