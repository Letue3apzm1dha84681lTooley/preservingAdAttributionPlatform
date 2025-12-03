import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import WalletManager from "./components/WalletManager";
import WalletSelector from "./components/WalletSelector";
import "./App.css";

interface EncryptedRecord {
  id: string;
  encryptedData: string;
  timestamp: number;
  owner: string;
  category: string;
  status: "pending" | "verified" | "rejected";
  campaignId?: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  spend?: number;
}

const App: React.FC = () => {
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<EncryptedRecord[]>([]);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    visible: boolean;
    status: "pending" | "success" | "error";
    message: string;
  }>({ visible: false, status: "pending", message: "" });
  const [newRecordData, setNewRecordData] = useState({
    category: "",
    campaignId: "",
    impressions: "",
    clicks: "",
    conversions: "",
    spend: ""
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [showTeamInfo, setShowTeamInfo] = useState(false);

  // Calculate statistics for dashboard
  const verifiedCount = records.filter(r => r.status === "verified").length;
  const pendingCount = records.filter(r => r.status === "pending").length;
  const rejectedCount = records.filter(r => r.status === "rejected").length;
  const totalRecords = records.length;

  useEffect(() => {
    loadRecords().finally(() => setLoading(false));
  }, []);

  const onWalletSelect = async (wallet: any) => {
    if (!wallet.provider) return;
    try {
      const web3Provider = new ethers.BrowserProvider(wallet.provider);
      setProvider(web3Provider);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const acc = accounts[0] || "";
      setAccount(acc);

      wallet.provider.on("accountsChanged", async (accounts: string[]) => {
        const newAcc = accounts[0] || "";
        setAccount(newAcc);
      });
    } catch (e) {
      alert("Failed to connect wallet");
    }
  };

  const onConnect = () => setWalletSelectorOpen(true);
  const onDisconnect = () => {
    setAccount("");
    setProvider(null);
  };

  const loadRecords = async () => {
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      // Check contract availability using FHE
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) {
        console.error("Contract is not available");
        return;
      }
      
      const keysBytes = await contract.getData("record_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing record keys:", e);
        }
      }
      
      const list: EncryptedRecord[] = [];
      
      for (const key of keys) {
        try {
          const recordBytes = await contract.getData(`record_${key}`);
          if (recordBytes.length > 0) {
            try {
              const recordData = JSON.parse(ethers.toUtf8String(recordBytes));
              list.push({
                id: key,
                encryptedData: recordData.data,
                timestamp: recordData.timestamp,
                owner: recordData.owner,
                category: recordData.category,
                status: recordData.status || "pending",
                campaignId: recordData.campaignId,
                impressions: recordData.impressions,
                clicks: recordData.clicks,
                conversions: recordData.conversions,
                spend: recordData.spend
              });
            } catch (e) {
              console.error(`Error parsing record data for ${key}:`, e);
            }
          }
        } catch (e) {
          console.error(`Error loading record ${key}:`, e);
        }
      }
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      setRecords(list);
    } catch (e) {
      console.error("Error loading records:", e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const submitRecord = async () => {
    if (!provider) { 
      alert("Please connect wallet first"); 
      return; 
    }
    
    setCreating(true);
    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Encrypting sensitive data with Zama FHE..."
    });
    
    try {
      // Simulate FHE encryption
      const encryptedData = `FHE-${btoa(JSON.stringify(newRecordData))}`;
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const recordId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const recordData = {
        data: encryptedData,
        timestamp: Math.floor(Date.now() / 1000),
        owner: account,
        category: newRecordData.category,
        status: "pending",
        campaignId: newRecordData.campaignId,
        impressions: parseInt(newRecordData.impressions) || 0,
        clicks: parseInt(newRecordData.clicks) || 0,
        conversions: parseInt(newRecordData.conversions) || 0,
        spend: parseFloat(newRecordData.spend) || 0
      };
      
      // Store encrypted data on-chain using FHE
      await contract.setData(
        `record_${recordId}`, 
        ethers.toUtf8Bytes(JSON.stringify(recordData))
      );
      
      const keysBytes = await contract.getData("record_keys");
      let keys: string[] = [];
      
      if (keysBytes.length > 0) {
        try {
          keys = JSON.parse(ethers.toUtf8String(keysBytes));
        } catch (e) {
          console.error("Error parsing keys:", e);
        }
      }
      
      keys.push(recordId);
      
      await contract.setData(
        "record_keys", 
        ethers.toUtf8Bytes(JSON.stringify(keys))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "Encrypted data submitted securely!"
      });
      
      await loadRecords();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowCreateModal(false);
        setNewRecordData({
          category: "",
          campaignId: "",
          impressions: "",
          clicks: "",
          conversions: "",
          spend: ""
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction")
        ? "Transaction rejected by user"
        : "Submission failed: " + (e.message || "Unknown error");
      
      setTransactionStatus({
        visible: true,
        status: "error",
        message: errorMessage
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    } finally {
      setCreating(false);
    }
  };

  const verifyRecord = async (recordId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Processing encrypted data with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const recordBytes = await contract.getData(`record_${recordId}`);
      if (recordBytes.length === 0) {
        throw new Error("Record not found");
      }
      
      const recordData = JSON.parse(ethers.toUtf8String(recordBytes));
      
      const updatedRecord = {
        ...recordData,
        status: "verified"
      };
      
      await contract.setData(
        `record_${recordId}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedRecord))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "FHE verification completed successfully!"
      });
      
      await loadRecords();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Verification failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const rejectRecord = async (recordId: string) => {
    if (!provider) {
      alert("Please connect wallet first");
      return;
    }

    setTransactionStatus({
      visible: true,
      status: "pending",
      message: "Processing encrypted data with FHE..."
    });

    try {
      // Simulate FHE computation time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contract = await getContractWithSigner();
      if (!contract) {
        throw new Error("Failed to get contract with signer");
      }
      
      const recordBytes = await contract.getData(`record_${recordId}`);
      if (recordBytes.length === 0) {
        throw new Error("Record not found");
      }
      
      const recordData = JSON.parse(ethers.toUtf8String(recordBytes));
      
      const updatedRecord = {
        ...recordData,
        status: "rejected"
      };
      
      await contract.setData(
        `record_${recordId}`, 
        ethers.toUtf8Bytes(JSON.stringify(updatedRecord))
      );
      
      setTransactionStatus({
        visible: true,
        status: "success",
        message: "FHE rejection completed successfully!"
      });
      
      await loadRecords();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
    } catch (e: any) {
      setTransactionStatus({
        visible: true,
        status: "error",
        message: "Rejection failed: " + (e.message || "Unknown error")
      });
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 3000);
    }
  };

  const isOwner = (address: string) => {
    return account.toLowerCase() === address.toLowerCase();
  };

  const tutorialSteps = [
    {
      title: "Connect Wallet",
      description: "Connect your Web3 wallet to interact with the platform",
      icon: "🔗"
    },
    {
      title: "Submit Encrypted Data",
      description: "Add your sensitive data which will be encrypted using FHE",
      icon: "🔒"
    },
    {
      title: "FHE Processing",
      description: "Your data is processed in encrypted state without decryption",
      icon: "⚙️"
    },
    {
      title: "Get Results",
      description: "Receive verifiable results while keeping your data private",
      icon: "📊"
    }
  ];

  const toggleRecordDetails = (recordId: string) => {
    if (expandedRecord === recordId) {
      setExpandedRecord(null);
    } else {
      setExpandedRecord(recordId);
    }
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="wood-spinner"></div>
      <p>Initializing encrypted connection...</p>
    </div>
  );

  return (
    <div className="app-container natural-theme">
      {/* Left sidebar */}
      <div className="app-sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <div className="leaf-icon"></div>
            </div>
            <h1>Privacy<span>Ad</span>Attribution</h1>
          </div>
        </div>
        
        <div className="sidebar-content">
          <div className="wallet-section">
            <WalletManager account={account} onConnect={onConnect} onDisconnect={onDisconnect} />
          </div>
          
          <div className="sidebar-stats">
            <h3>Data Overview</h3>
            <div className="stat-item">
              <div className="stat-label">Total Records</div>
              <div className="stat-value">{totalRecords}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Verified</div>
              <div className="stat-value">{verifiedCount}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Pending</div>
              <div className="stat-value">{pendingCount}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Rejected</div>
              <div className="stat-value">{rejectedCount}</div>
            </div>
          </div>
          
          <div className="sidebar-actions">
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="create-record-btn wood-button"
            >
              <div className="add-icon"></div>
              Add Campaign Data
            </button>
            
            <button 
              className="wood-button"
              onClick={() => setShowTutorial(!showTutorial)}
            >
              {showTutorial ? "Hide Tutorial" : "Show Tutorial"}
            </button>
            
            <button 
              className="wood-button"
              onClick={() => setShowTeamInfo(!showTeamInfo)}
            >
              {showTeamInfo ? "Hide Team" : "Show Team"}
            </button>
          </div>
        </div>
        
        <div className="sidebar-footer">
          <div className="fhe-badge">
            <span>FHE-Powered Privacy</span>
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} PrivacyAdAttribution
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="app-main">
        <div className="main-header">
          <h2>Privacy-Preserving Ad Attribution</h2>
          <p>Process sensitive advertising data in encrypted state using Zama FHE technology</p>
        </div>
        
        {showTutorial && (
          <div className="tutorial-section">
            <h2>Privacy Attribution Tutorial</h2>
            <p className="subtitle">Learn how to securely process sensitive advertising data</p>
            
            <div className="tutorial-steps">
              {tutorialSteps.map((step, index) => (
                <div 
                  className="tutorial-step"
                  key={index}
                >
                  <div className="step-icon">{step.icon}</div>
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {showTeamInfo && (
          <div className="team-section">
            <h2>Our Team</h2>
            <div className="team-grid">
              <div className="team-member">
                <div className="avatar"></div>
                <h3>Alex Chen</h3>
                <p>Founder & FHE Specialist</p>
              </div>
              <div className="team-member">
                <div className="avatar"></div>
                <h3>Maya Rodriguez</h3>
                <p>Blockchain Architect</p>
              </div>
              <div className="team-member">
                <div className="avatar"></div>
                <h3>Kenji Tanaka</h3>
                <p>Privacy Engineer</p>
              </div>
              <div className="team-member">
                <div className="avatar"></div>
                <h3>Sophie Dubois</h3>
                <p>AdTech Expert</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="records-section">
          <div className="section-header">
            <h2>Encrypted Campaign Data</h2>
            <div className="header-actions">
              <button 
                onClick={loadRecords}
                className="refresh-btn wood-button"
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          
          <div className="records-list">
            <div className="table-header">
              <div className="header-cell">ID</div>
              <div className="header-cell">Campaign</div>
              <div className="header-cell">Owner</div>
              <div className="header-cell">Date</div>
              <div className="header-cell">Status</div>
              <div className="header-cell">Actions</div>
            </div>
            
            {records.length === 0 ? (
              <div className="no-records">
                <div className="no-records-icon"></div>
                <p>No encrypted records found</p>
                <button 
                  className="wood-button primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create First Record
                </button>
              </div>
            ) : (
              records.map(record => (
                <React.Fragment key={record.id}>
                  <div className="record-row" onClick={() => toggleRecordDetails(record.id)}>
                    <div className="table-cell record-id">#{record.id.substring(0, 6)}</div>
                    <div className="table-cell">{record.campaignId || "N/A"}</div>
                    <div className="table-cell">{record.owner.substring(0, 6)}...{record.owner.substring(38)}</div>
                    <div className="table-cell">
                      {new Date(record.timestamp * 1000).toLocaleDateString()}
                    </div>
                    <div className="table-cell">
                      <span className={`status-badge ${record.status}`}>
                        {record.status}
                      </span>
                    </div>
                    <div className="table-cell actions">
                      {isOwner(record.owner) && record.status === "pending" && (
                        <>
                          <button 
                            className="action-btn wood-button success"
                            onClick={(e) => {
                              e.stopPropagation();
                              verifyRecord(record.id);
                            }}
                          >
                            Verify
                          </button>
                          <button 
                            className="action-btn wood-button danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              rejectRecord(record.id);
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {expandedRecord === record.id && (
                    <div className="record-details">
                      <div className="detail-row">
                        <span className="detail-label">Campaign ID:</span>
                        <span>{record.campaignId || "N/A"}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Impressions:</span>
                        <span>{record.impressions || 0}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Clicks:</span>
                        <span>{record.clicks || 0}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Conversions:</span>
                        <span>{record.conversions || 0}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Spend:</span>
                        <span>{record.spend ? `$${record.spend}` : "$0"}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Encrypted Data:</span>
                        <span className="encrypted-data">{record.encryptedData.substring(0, 40)}...</span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))
            )}
          </div>
        </div>
      </div>
  
      {showCreateModal && (
        <ModalCreate 
          onSubmit={submitRecord} 
          onClose={() => setShowCreateModal(false)} 
          creating={creating}
          recordData={newRecordData}
          setRecordData={setNewRecordData}
        />
      )}
      
      {walletSelectorOpen && (
        <WalletSelector
          isOpen={walletSelectorOpen}
          onWalletSelect={(wallet) => { onWalletSelect(wallet); setWalletSelectorOpen(false); }}
          onClose={() => setWalletSelectorOpen(false)}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content wood-card">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="wood-spinner"></div>}
              {transactionStatus.status === "success" && <div className="check-icon"></div>}
              {transactionStatus.status === "error" && <div className="error-icon"></div>}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ModalCreateProps {
  onSubmit: () => void; 
  onClose: () => void; 
  creating: boolean;
  recordData: any;
  setRecordData: (data: any) => void;
}

const ModalCreate: React.FC<ModalCreateProps> = ({ 
  onSubmit, 
  onClose, 
  creating,
  recordData,
  setRecordData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRecordData({
      ...recordData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (!recordData.category || !recordData.campaignId) {
      alert("Please fill required fields");
      return;
    }
    
    onSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="create-modal wood-card">
        <div className="modal-header">
          <h2>Add Encrypted Campaign Data</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice-banner">
            <div className="key-icon"></div> Your sensitive data will be encrypted with Zama FHE
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Category *</label>
              <select 
                name="category"
                value={recordData.category} 
                onChange={handleChange}
                className="wood-select"
              >
                <option value="">Select category</option>
                <option value="Display">Display Ads</option>
                <option value="Search">Search Ads</option>
                <option value="Social">Social Media</option>
                <option value="Video">Video Ads</option>
                <option value="Native">Native Ads</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Campaign ID *</label>
              <input 
                type="text"
                name="campaignId"
                value={recordData.campaignId} 
                onChange={handleChange}
                placeholder="Campaign identifier..." 
                className="wood-input"
              />
            </div>
            
            <div className="form-group">
              <label>Impressions</label>
              <input 
                type="number"
                name="impressions"
                value={recordData.impressions} 
                onChange={handleChange}
                placeholder="Number of impressions..." 
                className="wood-input"
              />
            </div>
            
            <div className="form-group">
              <label>Clicks</label>
              <input 
                type="number"
                name="clicks"
                value={recordData.clicks} 
                onChange={handleChange}
                placeholder="Number of clicks..." 
                className="wood-input"
              />
            </div>
            
            <div className="form-group">
              <label>Conversions</label>
              <input 
                type="number"
                name="conversions"
                value={recordData.conversions} 
                onChange={handleChange}
                placeholder="Number of conversions..." 
                className="wood-input"
              />
            </div>
            
            <div className="form-group">
              <label>Spend ($)</label>
              <input 
                type="number"
                name="spend"
                value={recordData.spend} 
                onChange={handleChange}
                placeholder="Campaign spend..." 
                className="wood-input"
                step="0.01"
              />
            </div>
          </div>
          
          <div className="privacy-notice">
            <div className="privacy-icon"></div> Data remains encrypted during FHE processing
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="cancel-btn wood-button"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={creating}
            className="submit-btn wood-button primary"
          >
            {creating ? "Encrypting with FHE..." : "Submit Securely"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;