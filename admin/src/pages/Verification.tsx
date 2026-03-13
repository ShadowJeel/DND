import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle2, XCircle, FileText, User, Building, Phone, Mail, FileBadge2 } from 'lucide-react';

type UserData = {
    id: string;
    name: string;
    display_name?: string;
    email: string;
    phone: string;
    company: string;
    entity_type: string;
    aadhaar_number?: string;
    aadhaar_document_path?: string;
    gstin?: string;
    gst_certificate_path?: string;
    verified: boolean;
    role: 'buyer' | 'seller';
    created_at: string;
};

export function Verification() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending');
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<UserData>>({});

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);

            const buyersSnap = await getDocs(collection(db, 'buyers'));
            const sellersSnap = await getDocs(collection(db, 'sellers'));

            const bData = buyersSnap.docs.map(b => ({ ...b.data(), id: b.id, role: 'buyer' as const }));
            const sData = sellersSnap.docs.map(s => ({ ...s.data(), id: s.id, role: 'seller' as const }));

            const mergedUsers: UserData[] = [
                ...bData as unknown as UserData[],
                ...sData as unknown as UserData[]
            ].sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
            });
            setUsers(mergedUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCertificateUrl = (path: string) => {
        if (!path) return '';
        // If it's already a full URL (legacy/existing data), return it as is
        if (path.startsWith('http')) return path;

        // Otherwise construct the Firebase Storage URL
        const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
        return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/documents%2F${encodeURIComponent(path)}?alt=media`;
    };

    const handleAccept = async (user: UserData) => {
        if (!window.confirm(`Are you sure you want to verify ${user.name}?`)) return;

        try {
            const table = user.role === 'buyer' ? 'buyers' : 'sellers';
            await updateDoc(doc(db, table, user.id), { verified: true });

            setUsers(users.map(u => u.id === user.id ? { ...u, verified: true } : u));
            setSelectedUser(null);
        } catch (error) {
            console.error('Error accepting user:', error);
            alert('Failed to verify user.');
        }
    };

    const handleReject = async (user: UserData) => {
        if (!window.confirm(`Are you sure you want to completely delete ${user.name}? This action cannot be undone.`)) return;

        try {
            const table = user.role === 'buyer' ? 'buyers' : 'sellers';
            await deleteDoc(doc(db, table, user.id));

            setUsers(users.filter(u => u.id !== user.id));
            setSelectedUser(null);
        } catch (error) {
            console.error('Error rejecting user:', error);
            alert('Failed to delete user.');
        }
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;

        try {
            const table = selectedUser.role === 'buyer' ? 'buyers' : 'sellers';
            const updates = {
                name: editForm.name || selectedUser.name,
                display_name: editForm.display_name,
                phone: editForm.phone || selectedUser.phone,
                company: editForm.company || selectedUser.company,
            };

            await updateDoc(doc(db, table, selectedUser.id), updates);

            setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...updates } : u));
            setSelectedUser({ ...selectedUser, ...updates });
            setIsEditing(false);
            alert('User profile updated successfully.');
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Failed to update user profile.');
        }
    };

    const startEditing = () => {
        if (!selectedUser) return;
        setEditForm({
            name: selectedUser.name,
            display_name: selectedUser.display_name || '',
            phone: selectedUser.phone,
            company: selectedUser.company,
        });
        setIsEditing(true);
    };

    const displayedUsers = users.filter(u => activeTab === 'pending' ? !u.verified : u.verified);

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">User Verification</h2>
                <p className="text-muted-foreground mt-1">Review and approve buyer and seller accounts.</p>
            </div>

            <div className="flex space-x-1 rounded-xl bg-muted p-1 w-fit">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${activeTab === 'pending' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}`}
                >
                    Pending Verification
                    <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                        {users.filter(u => !u.verified).length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('verified')}
                    className={`flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${activeTab === 'verified' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}`}
                >
                    Verified Users
                    <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/20 text-xs">
                        {users.filter(u => u.verified).length}
                    </span>
                </button>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                {loading ? (
                    <div className="text-center py-16 text-muted-foreground">Loading users...</div>
                ) : displayedUsers.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        No {activeTab} users found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Name & Role</th>
                                    <th className="px-6 py-4 font-medium">Company</th>
                                    <th className="px-6 py-4 font-medium">Contact</th>
                                    <th className="px-6 py-4 font-medium">Documents</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {displayedUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-foreground">{user.name}</div>
                                            {user.display_name && (
                                                <div className="text-xs text-muted-foreground mt-0.5">As: {user.display_name}</div>
                                            )}
                                            <div className="text-xs mt-1 uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-full border border-border bg-background inline-block">
                                                {user.role}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Building className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{user.company || 'N/A'}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 capitalize">{user.entity_type}</div>
                                        </td>
                                        <td className="px-6 py-4 space-y-1">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Mail className="h-3.5 w-3.5" /> {user.email}
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Phone className="h-3.5 w-3.5" /> {user.phone}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {user.gstin ? (
                                                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> GSTIN Provided
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <XCircle className="h-3.5 w-3.5" /> No GSTIN
                                                    </div>
                                                )}
                                                {user.aadhaar_number ? (
                                                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Aadhaar Provided
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <XCircle className="h-3.5 w-3.5" /> No Aadhaar
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setIsEditing(false);
                                                }}
                                                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 transition-colors"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* User Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    {isEditing ? 'Edit Profile' : selectedUser.name}
                                    {selectedUser.verified && !isEditing && (
                                        <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 border border-emerald-500/20">
                                            <CheckCircle2 className="h-3 w-3" /> Verified
                                        </span>
                                    )}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1 capitalize">{selectedUser.role} Account • Joined {new Date(selectedUser.created_at).toLocaleDateString()}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedUser(null);
                                    setIsEditing(false);
                                }}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Full Name</label>
                                            <input
                                                type="text"
                                                value={editForm.name || ''}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Display Name (Read-only)</label>
                                            <input
                                                type="text"
                                                value={editForm.display_name || ''}
                                                readOnly
                                                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Phone</label>
                                            <input
                                                type="text"
                                                value={editForm.phone || ''}
                                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Company</label>
                                            <input
                                                type="text"
                                                value={editForm.company || ''}
                                                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleUpdateUser}
                                            className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">Contact Information</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="text-xs text-muted-foreground mb-1">Email Address</div>
                                                    <div className="font-medium break-all">{selectedUser.email}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground mb-1">Display Name</div>
                                                    <div className="font-medium">{selectedUser.display_name || 'Not Set'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground mb-1">Phone Number</div>
                                                    <div className="font-medium">{selectedUser.phone}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">Business Profile</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="text-xs text-muted-foreground mb-1">Company Name</div>
                                                    <div className="font-medium">{selectedUser.company || 'Not Provided'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground mb-1">Entity Type</div>
                                                    <div className="font-medium capitalize">{selectedUser.entity_type || 'unspecified'}</div>
                                                </div>
                                                <button
                                                    onClick={startEditing}
                                                    className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline"
                                                >
                                                    Edit Basic Info
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border flex items-center gap-2">
                                            <FileBadge2 className="h-4 w-4" /> Legal Documents
                                        </h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="rounded-lg border border-border p-4 bg-muted/20">
                                                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">GST Information</div>
                                                {selectedUser.gstin ? (
                                                    <div className="space-y-2">
                                                        <div className="font-mono text-sm font-medium bg-background border border-border px-3 py-1.5 rounded-md inline-block">{selectedUser.gstin}</div>
                                                        {selectedUser.gst_certificate_path && (
                                                            <a
                                                                href={getCertificateUrl(selectedUser.gst_certificate_path)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 text-sm text-primary hover:underline mt-2"
                                                            >
                                                                <FileText className="h-4 w-4" /> View GST Certificate
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-muted-foreground italic">No GST Information provided</div>
                                                )}
                                            </div>

                                            <div className="rounded-lg border border-border p-4 bg-muted/20">
                                                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Aadhaar Information</div>
                                                {selectedUser.aadhaar_number ? (
                                                    <div className="space-y-2">
                                                        <div className="font-mono text-sm font-medium bg-background border border-border px-3 py-1.5 rounded-md inline-block">{selectedUser.aadhaar_number}</div>
                                                        {selectedUser.aadhaar_document_path && (
                                                            <a
                                                                href={getCertificateUrl(selectedUser.aadhaar_document_path)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 text-sm text-primary hover:underline mt-2"
                                                            >
                                                                <FileText className="h-4 w-4" /> View Aadhaar Document
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-muted-foreground italic">No Aadhaar Information provided</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-between gap-4 mt-auto">
                            <button
                                onClick={() => {
                                    setSelectedUser(null);
                                    setIsEditing(false);
                                }}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Close View
                            </button>

                            {!isEditing && (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleReject(selectedUser)}
                                        className="px-6 py-2 rounded-md text-sm font-medium border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                    >
                                        Reject & Delete
                                    </button>
                                    {!selectedUser.verified && (
                                        <button
                                            onClick={() => handleAccept(selectedUser)}
                                            className="px-6 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                                        >
                                            Accept & Verify
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
