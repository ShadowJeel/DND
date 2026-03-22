import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { MapPin, Plus, Trash2 } from 'lucide-react';

type Location = {
    id: string; // state ID
    state_name: string;
    districts: string[];
};

export function ManageLocations() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [newStateName, setNewStateName] = useState('');
    const [loading, setLoading] = useState(false);

    const [buyerOptionType, setBuyerOptionType] = useState<'text' | 'number' | 'dropdown' | 'checkbox' | 'radio' | 'none'>('dropdown');
    const [sellerOptionType, setSellerOptionType] = useState<'text' | 'number' | 'dropdown' | 'checkbox' | 'radio' | 'none'>('dropdown');
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        fetchLocations();
        fetchLocationSettings();
    }, []);

    const fetchLocationSettings = async () => {
        try {
            const docRef = doc(db, 'settings', 'location');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.buyer_option_type) setBuyerOptionType(data.buyer_option_type);
                if (data.seller_option_type) setSellerOptionType(data.seller_option_type);
            }
        } catch (error) {
            console.error("Error fetching location settings", error);
        }
    };

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'locations'));
            const data: Location[] = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Location));
            data.sort((a, b) => a.state_name.localeCompare(b.state_name));
            setLocations(data);
        } catch (error) {
            console.error("Error fetching locations", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            const docRef = doc(db, 'settings', 'location');
            await setDoc(docRef, {
                buyer_option_type: buyerOptionType,
                seller_option_type: sellerOptionType,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            alert("Location settings saved successfully!");
        } catch (error) {
            console.error("Error saving location settings", error);
            alert("Failed to save location settings");
        } finally {
            setSavingSettings(false);
        }
    };

    const handleAddState = async () => {
        const name = newStateName.trim();
        if (!name) return;

        // check if state already exists (case insensitive)
        const exists = locations.find(l => l.state_name.toLowerCase() === name.toLowerCase());
        if (exists) {
            alert("State already exists");
            return;
        }

        try {
            const stateId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const ref = doc(db, 'locations', stateId);
            await setDoc(ref, {
                state_name: name,
                districts: []
            });
            setNewStateName('');
            await fetchLocations();
        } catch (error) {
            console.error("Error adding state", error);
            alert("Failed to add state");
        }
    };

    const handleRemoveState = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to completely remove the state "${name}" and all its districts?`)) return;

        try {
            await deleteDoc(doc(db, 'locations', id));
            await fetchLocations();
        } catch (error) {
            console.error("Error removing state", error);
            alert("Failed to remove state");
        }
    };

    const handleAddDistrict = async (stateId: string, currentDistricts: string[], newDistrictName: string) => {
        const name = newDistrictName.trim();
        if (!name) return;

        const newDistrictsList = name.split(',').map(s => s.trim()).filter(Boolean);
        if (newDistrictsList.length === 0) return;

        const updatedDistricts = [...currentDistricts];
        let added = false;

        for (const dist of newDistrictsList) {
            if (!updatedDistricts.some(d => d.toLowerCase() === dist.toLowerCase())) {
                updatedDistricts.push(dist);
                added = true;
            }
        }

        if (!added) return; // all existed

        updatedDistricts.sort((a, b) => a.localeCompare(b));

        try {
            await updateDoc(doc(db, 'locations', stateId), {
                districts: updatedDistricts
            });
            await fetchLocations();
        } catch (error) {
            console.error("Error adding districts", error);
            alert("Failed to add districts");
        }
    };

    const handleRemoveDistrict = async (stateId: string, currentDistricts: string[], districtToRemove: string) => {
        const updatedDistricts = currentDistricts.filter(d => d !== districtToRemove);
        try {
            await updateDoc(doc(db, 'locations', stateId), {
                districts: updatedDistricts
            });
            await fetchLocations();
        } catch (error) {
            console.error("Error removing district", error);
            alert("Failed to remove district");
        }
    };

    return (
        <div className="space-y-6 max-w-6xl">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Manage Locations</h2>
                <p className="text-muted-foreground mt-1">Configure available Delivery States and their Districts.</p>
            </div>

            <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold">Location Field Configuration</h3>
                        <p className="text-sm text-muted-foreground">Configure how the location field appears for buyers and sellers across the app.</p>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Buyer Field Type</label>
                        <select
                            value={buyerOptionType}
                            onChange={(e) => setBuyerOptionType(e.target.value as any)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="none">Not Required (None)</option>
                            <option value="text">Text Input</option>
                            <option value="number">Number Input</option>
                            <option value="checkbox">Checkbox List</option>
                            <option value="dropdown">Dropdown Menu</option>
                            <option value="radio">Radio Button</option>
                        </select>
                    </div>
                    <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Seller Field Type</label>
                        <select
                            value={sellerOptionType}
                            onChange={(e) => setSellerOptionType(e.target.value as any)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="none">Not Required (None)</option>
                            <option value="text">Text Input</option>
                            <option value="number">Number Input</option>
                            <option value="checkbox">Checkbox List</option>
                            <option value="dropdown">Dropdown Menu</option>
                            <option value="radio">Radio Button</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={handleSaveSettings}
                            disabled={savingSettings}
                            className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                            {savingSettings ? 'Saving...' : 'Save Options'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 grid gap-6">
                <div>
                    <h3 className="text-lg font-semibold mb-3">Add New State</h3>
                    <div className="flex max-w-sm gap-2">
                        <input
                            type="text"
                            placeholder="e.g. Gujarat"
                            value={newStateName}
                            onChange={(e) => setNewStateName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddState();
                            }}
                            className="h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <button
                            onClick={handleAddState}
                            className="h-10 px-4 flex items-center gap-2 rounded-md font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="h-4 w-4" /> Add State
                        </button>
                    </div>
                </div>

                <div className="border-t border-border pt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {locations.map(loc => (
                        <div key={loc.id} className="p-4 rounded-lg border border-border bg-background shadow-sm flex flex-col">
                            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                                <h4 className="font-semibold text-lg flex items-center gap-2 text-foreground">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    {loc.state_name}
                                </h4>
                                <button
                                    onClick={() => handleRemoveState(loc.id, loc.state_name)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-sm hover:bg-destructive/10"
                                    title="Delete State"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex-1">
                                {loc.districts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic mb-4">No districts added yet.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {loc.districts.map(dist => (
                                            <div key={dist} className="flex items-center gap-1 bg-muted/50 border border-border px-2 py-1 rounded-md text-sm">
                                                <span>{dist}</span>
                                                <button
                                                    onClick={() => handleRemoveDistrict(loc.id, loc.districts, dist)}
                                                    className="text-muted-foreground hover:text-destructive ml-1 focus-visible:outline-none"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-auto pt-3 border-t border-border/50">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        id={`new-dist-${loc.id}`}
                                        placeholder="Add district..."
                                        className="h-8 flex-1 rounded-md border border-input bg-card px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddDistrict(loc.id, loc.districts, e.currentTarget.value);
                                                e.currentTarget.value = '';
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById(`new-dist-${loc.id}`) as HTMLInputElement;
                                            if (input && input.value) {
                                                handleAddDistrict(loc.id, loc.districts, input.value);
                                                input.value = '';
                                            }
                                        }}
                                        className="h-8 px-3 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1.5">Tip: Comma separated values allowed</p>
                            </div>
                        </div>
                    ))}

                    {locations.length === 0 && !loading && (
                        <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                            No states configured yet. Add one above.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
