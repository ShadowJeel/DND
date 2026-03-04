import { useEffect, useState } from "react"
import { Users, FileText, ShoppingCart, TrendingUp } from "lucide-react"
import { collection, getCountFromServer, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "../lib/firebase"

export function Dashboard() {
    const [statsData, setStatsData] = useState({
        totalUsers: "...",
        activeInquiries: "...",
        totalOffers: "...",
        revenue: "₹0",
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Total Users = buyers + sellers
                const buyersSnap = await getCountFromServer(collection(db, 'buyers'));
                const sellersSnap = await getCountFromServer(collection(db, 'sellers'));
                const totalUsersCount = buyersSnap.data().count + sellersSnap.data().count;

                // Total Inquiries
                const inquiriesSnap = await getCountFromServer(collection(db, 'inquiries'));

                // Total Offers
                const offersSnap = await getCountFromServer(collection(db, 'offers'));

                // Fetch Platform Revenue Directly from accepted Offers
                const { query: firestoreQuery, where, getDocs } = await import('firebase/firestore');

                // Query all offers with status 'accepted'
                const acceptedOffersQuery = firestoreQuery(collection(db, 'offers'), where('status', '==', 'accepted'));
                const acceptedOffersSnap = await getDocs(acceptedOffersQuery);

                let totalRevenue = 0;
                acceptedOffersSnap.forEach((doc) => {
                    const data = doc.data();
                    const amount = data.amount || data.price || 0;
                    // Calculate 5% platform fee
                    totalRevenue += Number(amount) * 0.05;
                });

                const formattedRevenue = new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 0
                }).format(totalRevenue);

                setStatsData({
                    totalUsers: totalUsersCount.toLocaleString(),
                    activeInquiries: inquiriesSnap.data().count.toString(),
                    totalOffers: offersSnap.data().count.toString(),
                    revenue: formattedRevenue,
                });

                // Recent Activity - fetch latest 5 inquiries and offers
                const inqQuery = query(collection(db, 'inquiries'), orderBy('created_at', 'desc'), limit(5));
                const offersQuery = query(collection(db, 'offers'), orderBy('created_at', 'desc'), limit(5));

                const [inqDocs, offersDocs] = await Promise.all([
                    getDocs(inqQuery).catch(() => ({ docs: [] })),
                    getDocs(offersQuery).catch(() => ({ docs: [] }))
                ]);

                interface ActivityItem {
                    id: string;
                    type: 'Inquiry' | 'Offer';
                    created_at: string;
                    product_name?: string;
                    inquiry_id?: string;
                    [key: string]: any;
                }

                const activities: ActivityItem[] = [
                    ...inqDocs.docs.map(d => {
                        const data = d.data();
                        return { id: d.id, type: 'Inquiry' as const, created_at: data.created_at || '', ...data };
                    }),
                    ...offersDocs.docs.map(d => {
                        const data = d.data();
                        return { id: d.id, type: 'Offer' as const, created_at: data.created_at || '', ...data };
                    })
                ];

                activities.sort((a, b) => {
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA;
                });

                setRecentActivity(activities.slice(0, 5));

            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            }
        };

        fetchStats();
    }, []);

    const stats = [
        { title: "Total Users", value: statsData.totalUsers, icon: Users, trend: "" },
        { title: "Total Inquiries", value: statsData.activeInquiries, icon: FileText, trend: "" },
        { title: "Total Offers", value: statsData.totalOffers, icon: ShoppingCart, trend: "" },
        { title: "Revenue (Platform)", value: statsData.revenue, icon: TrendingUp, trend: "" },
    ]

    const timeAgo = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
                <p className="text-muted-foreground mt-1">Platform statistics and activity at a glance.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.title} className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between h-32">
                        <div className="flex flex-row items-center justify-between pb-2">
                            <h3 className="tracking-tight text-sm font-medium">{stat.title}</h3>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            {stat.trend && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    <span className="text-emerald-500 font-medium">{stat.trend}</span> from last month
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm col-span-4 p-6 hidden md:block">
                    <h3 className="font-semibold mb-4">Activity Chart</h3>
                    <div className="h-[300px] w-full bg-accent/20 rounded-md flex items-center justify-center border border-dashed border-border text-muted-foreground">
                        Chart Placeholder
                    </div>
                </div>
                <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm col-span-3 p-6">
                    <h3 className="font-semibold mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {recentActivity.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No recent activity.</p>
                        ) : (
                            recentActivity.map((activity, i) => (
                                <div key={activity.id + i} className="flex items-center gap-4">
                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-xs font-medium text-primary">
                                            {activity.type === 'Inquiry' ? 'IN' : 'OF'}
                                        </span>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {activity.type === 'Inquiry' ? 'New Inquiry Created' : 'New Offer Initialized'}
                                        </p>
                                        <p className="text-sm text-muted-foreground truncate w-[200px]">
                                            {activity.type === 'Inquiry' ? `Product: ${activity.product_name || 'Unknown'}` : `Offer for Inquiry: ${activity.inquiry_id}`}
                                        </p>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {timeAgo(activity.created_at)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
