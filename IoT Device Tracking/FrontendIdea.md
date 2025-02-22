### **💡 Frontend Architecture & Workflow for IoT Blockchain Project**  

The **frontend** will be the user interface for interacting with IoT devices, managing blockchain transactions, and visualizing data. It must be **intuitive, fast, and secure**, with seamless blockchain integrations.  

---

## **🛠️ Tech Stack for the Frontend**
| Component | Technology | Purpose |
|------------|------------|-----------|
| **Framework** | **Next.js (React.js, TypeScript)** | SEO-friendly, server-side rendering, API routes |
| **UI Library** | **Chakra UI / Tailwind CSS** | Modern, responsive UI styling |
| **State Management** | **Zustand / Redux Toolkit / React Context API** | Manage blockchain state, user sessions |
| **Blockchain SDK** | **Ethers.js / Wagmi / RainbowKit** | Interact with Ethereum, handle smart contract calls |
| **Real-time Communication** | **Socket.io / WebSockets** | Handle IoT device data in real-time |
| **Authentication** | **NextAuth.js + JWT** | Secure authentication with roles |
| **Graphing & Analytics** | **Recharts / D3.js** | Visualize IoT data and blockchain events |
| **API Handling** | **Axios / React Query** | Fetch and cache backend data efficiently |

---

## **🚀 How the Frontend Will Work**
The frontend will consist of **six main sections**:  
1. **Device Registration & Management**  
2. **Data Recording & Visualization**  
3. **Blockchain Transactions & Reward Management**  
4. **Oracle Integration & Verification**  
5. **User Authentication & Role-Based Access**  
6. **Admin Dashboard for System Management**  

---

## **🔹 1. Device Registration & Management**
### **How it Works**
- Users can **register IoT devices** via a form.  
- Calls **`registerDevice`** function in `DeviceRegistry.sol`.  
- Device status (**Active / Inactive / Pending Approval**) is displayed.  
- Admins can **approve/reject** devices via the dashboard.  

### **Components & Pages**
| Component | Page | Description |
|------------|------|-------------|
| `DeviceForm.tsx` | `/devices/register` | Form to register a new IoT device |
| `DeviceList.tsx` | `/devices` | Displays all registered devices |
| `DeviceDetails.tsx` | `/devices/[id]` | Shows metadata & status of a specific device |
| `AdminDeviceApproval.tsx` | `/admin/devices` | Admin page to approve/reject devices |

### **API Calls (Using Axios)**
```tsx
const registerDevice = async (deviceData) => {
  return axios.post('/api/devices/register', deviceData);
};

const fetchDevices = async () => {
  return axios.get('/api/devices');
};
```

---

## **🔹 2. Data Recording & Visualization**
### **How it Works**
- Devices send real-time data to the backend via **MQTT / WebSockets**.  
- The frontend **listens** for updates and **displays live sensor data**.  
- **Graphs & analytics** show trends over time.  

### **Components & Pages**
| Component | Page | Description |
|------------|------|-------------|
| `LiveDataFeed.tsx` | `/data/live` | Displays real-time IoT data |
| `DeviceGraph.tsx` | `/data/device/[id]` | Charts showing a device’s historical data |
| `DataLogs.tsx` | `/data/logs` | Table displaying all data logs |

### **Example WebSocket Hook**
```tsx
import { useEffect, useState } from "react";
import io from "socket.io-client";

const useLiveData = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const socket = io("http://localhost:5000"); 
    socket.on("newData", (newData) => {
      setData(prevData => [...prevData, newData]);
    });

    return () => socket.disconnect();
  }, []);

  return data;
};
```

---

## **🔹 3. Blockchain Transactions & Reward Management**
### **How it Works**
- Users can **claim rewards** via the frontend.  
- The frontend **calls `claimReward()`** in `TokenRewards.sol`.  
- Reward balances **are fetched from the blockchain** using `Ethers.js`.  

### **Components & Pages**
| Component | Page | Description |
|------------|------|-------------|
| `RewardDashboard.tsx` | `/rewards` | Displays user rewards & balance |
| `ClaimReward.tsx` | `/rewards/claim` | Allows users to claim blockchain rewards |
| `TransactionHistory.tsx` | `/transactions` | Shows past transactions on the blockchain |

### **Example Smart Contract Call (Ethers.js)**
```tsx
import { ethers } from "ethers";
import rewardABI from "../abis/TokenRewards.json";

const claimReward = async () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const contract = new ethers.Contract(REWARD_CONTRACT_ADDRESS, rewardABI, signer);

  try {
    const tx = await contract.claimReward();
    await tx.wait();
    console.log("Reward claimed!");
  } catch (error) {
    console.error("Transaction failed:", error);
  }
};
```

---

## **🔹 4. Oracle Integration & Verification**
### **How it Works**
- Users can **manually trigger verification** for IoT data.  
- Backend **calls Chainlink Oracle** to fetch real-world data.  
- Verification status is displayed on the frontend.  

### **Components & Pages**
| Component | Page | Description |
|------------|------|-------------|
| `OracleVerification.tsx` | `/oracle/verify` | UI to trigger oracle verification |
| `OracleResults.tsx` | `/oracle/results` | Displays verification results |

### **Example API Call for Oracle**
```tsx
const verifyData = async (deviceId) => {
  return axios.post('/api/data/verify', { deviceId });
};
```

---

## **🔹 5. User Authentication & Role-Based Access**
### **How it Works**
- Uses **NextAuth.js** for JWT-based authentication.  
- Users **log in with email + password**.  
- Role-based access is handled via **middleware**.  

### **Components & Pages**
| Component | Page | Description |
|------------|------|-------------|
| `Login.tsx` | `/auth/login` | Login form |
| `Register.tsx` | `/auth/register` | User registration |
| `UserProfile.tsx` | `/profile` | Displays user info & permissions |

### **Example Auth Middleware**
```tsx
import { useSession } from "next-auth/react";

const withAdmin = (Component) => (props) => {
  const { data: session } = useSession();
  if (!session || session.user.role !== "ADMIN") {
    return <p>Access Denied</p>;
  }
  return <Component {...props} />;
};

export default withAdmin;
```

---

## **🔹 6. Admin Dashboard for System Management**
### **How it Works**
- Admins can **approve devices, manage users, and monitor blockchain transactions**.  
- Uses **React Table** for viewing data.  
- Has **protected routes** (only accessible to admins).  

### **Components & Pages**
| Component | Page | Description |
|------------|------|-------------|
| `AdminDashboard.tsx` | `/admin` | Overview of all system activity |
| `ManageUsers.tsx` | `/admin/users` | View & edit user roles |
| `ManageDevices.tsx` | `/admin/devices` | Approve/reject devices |

---

## **🌐 Frontend Architecture Diagram**
```plaintext
🖥️ User → (Next.js UI) → 🛠️ API Calls → 🎭 Middleware (Auth) → 
📡 IoT Data WebSocket ↔ Backend → 🔗 Blockchain (Ethers.js) 
```

---

## **📌 Final Thoughts**
This **Next.js frontend** will provide a seamless experience for **IoT device owners, admins, and users**.  
It ensures:  
✅ **Real-time updates** (WebSockets for IoT data)  
✅ **Blockchain interaction** (Ethers.js & Wagmi)  
✅ **Role-based access** (NextAuth.js)  
✅ **Modern UI/UX** (Chakra UI / Shadcn UI)  

---
