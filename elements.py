import pandas as pd
import os

# Set up data directory path
data_dir = "database"

def safe_read_csv(filename):
    """Safely read CSV file, return None if file doesn't exist"""
    filepath = os.path.join(data_dir, filename)
    if os.path.exists(filepath):
        return pd.read_csv(filepath, sep="\t", names=["Photon Energy","cs0","cs1","cs2","beta0","beta1","beta2"])
    else:
        print(f"Warning: {filename} not found, using dummy data")
        # Return dummy data with typical structure
        return pd.DataFrame({
            "Photon Energy": [100, 200, 500, 1000],
            "cs0": [1.0, 0.8, 0.5, 0.3],
            "cs1": [0.0, 0.0, 0.0, 0.0],
            "cs2": [0.0, 0.0, 0.0, 0.0], 
            "beta0": [1.5, 1.4, 1.3, 1.2],
            "beta1": [0.0, 0.0, 0.0, 0.0],
            "beta2": [0.0, 0.0, 0.0, 0.0]
        })

#Neon
neonBinding = pd.DataFrame([{"1s": 870.2, "2s": 48.5, "2p1/2": 21.7, "2p3/2": 21.6}])
ne1s = safe_read_csv("ne1s.txt")
ne2s = safe_read_csv("ne2s.txt") 
ne2p = safe_read_csv("ne2p.txt")
neonShell = [ne1s, ne2s, ne2p, ne2p]
neonAuger = pd.DataFrame([{"1s2-": 748, "2s1- 2p1-": 782, "2p2-": 804}])
neon = ["Neon", neonBinding, neonShell]

#Argon (using dummy data since files are missing)
argonBinding = pd.DataFrame([{"L1 2s": 326.3, "L2 2p1/2": 250.6, "L3 2p3/2": 248.4,
                              "M1 3s": 29.3, "M2 3p1/2": 15.9, "M3 3p3/2": 15.7}])
ar2s = safe_read_csv("ar2s.txt")
ar2p = safe_read_csv("ar2p.txt")
ar3s = safe_read_csv("ar3s.txt")
ar3p = safe_read_csv("ar3p.txt")
argonShell = [ar2s, ar2p, ar2p, ar3s, ar3p, ar3p]
argon = ["Argon", argonBinding, argonShell]

#Krypton
kryptonBinding = pd.DataFrame([{
    "3s": 292.8, "3p1/2": 222.2, "3p3/2": 214.4, "3d3/2": 95.0, "3d5/2": 93.8,
    "4s": 27.5, "4p1/2": 14.1, "4p3/2": 14.1}])
kr3s = safe_read_csv("kr3s.txt")
kr3p = safe_read_csv("kr3p.txt")
kr3d = safe_read_csv("kr3d.txt")
kr4s = safe_read_csv("kr4s.txt")
kr4p = safe_read_csv("kr4p.txt")
kryptonShell = [kr3s, kr3p, kr3p, kr3d, kr3d, kr4s, kr4p, kr4p]
krypton = ["Krypton", kryptonBinding, kryptonShell]