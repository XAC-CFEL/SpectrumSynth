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

def scale_cross_section(df, factor):
    """Scale cross-section values in a DataFrame by a given factor
    
    Args:
        df: DataFrame with cross-section data
        factor: Multiplicative factor to scale cs0, cs1, cs2
    
    Returns:
        New DataFrame with scaled cross-sections
    """
    scaled_df = df.copy()
    scaled_df["cs0"] = df["cs0"] * factor
    scaled_df["cs1"] = df["cs1"] * factor
    scaled_df["cs2"] = df["cs2"] * factor
    # Note: beta values are not scaled, they're angular distribution parameters
    return scaled_df

#Neon
neonBinding = pd.DataFrame([{"1s": 870.2, "2s": 48.5, "2p1/2": 21.7, "2p3/2": 21.6}])
ne1s = safe_read_csv("ne1s.txt")
ne2s = safe_read_csv("ne2s.txt") 
ne2p = safe_read_csv("ne2p.txt")
# Divide 2p cross-section: 2p1/2 gets 1/3, 2p3/2 gets 2/3 (based on degeneracy)
ne2p_1half = scale_cross_section(ne2p, 1/3)  # j=1/2 has 2 states
ne2p_3half = scale_cross_section(ne2p, 2/3)  # j=3/2 has 4 states
neonShell = [ne1s, ne2s, ne2p_1half, ne2p_3half]
neonAuger = pd.DataFrame([{"1s2-": 748, "2s1- 2p1-": 782, "2p2-": 804}])
neon = ["Neon", neonBinding, neonShell]

#Argon (using dummy data since files are missing)
argonBinding = pd.DataFrame([{"L1 2s": 326.3, "L2 2p1/2": 250.6, "L3 2p3/2": 248.4,
                              "M1 3s": 29.3, "M2 3p1/2": 15.9, "M3 3p3/2": 15.7}])
ar2s = safe_read_csv("ar2s.txt")
ar2p = safe_read_csv("ar2p.txt")
ar3s = safe_read_csv("ar3s.txt")
ar3p = safe_read_csv("ar3p.txt")
# Divide cross-sections for p orbitals
ar2p_1half = scale_cross_section(ar2p, 1/3)
ar2p_3half = scale_cross_section(ar2p, 2/3)
ar3p_1half = scale_cross_section(ar3p, 1/3)
ar3p_3half = scale_cross_section(ar3p, 2/3)
argonShell = [ar2s, ar2p_1half, ar2p_3half, ar3s, ar3p_1half, ar3p_3half]
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
# Divide cross-sections for p and d orbitals
kr3p_1half = scale_cross_section(kr3p, 1/3)
kr3p_3half = scale_cross_section(kr3p, 2/3)
kr3d_3half = scale_cross_section(kr3d, 2/5)  # j=3/2 has 4 states
kr3d_5half = scale_cross_section(kr3d, 3/5)  # j=5/2 has 6 states
kr4p_1half = scale_cross_section(kr4p, 1/3)
kr4p_3half = scale_cross_section(kr4p, 2/3)
kryptonShell = [kr3s, kr3p_1half, kr3p_3half, kr3d_3half, kr3d_5half, kr4s, kr4p_1half, kr4p_3half]
krypton = ["Krypton", kryptonBinding, kryptonShell]