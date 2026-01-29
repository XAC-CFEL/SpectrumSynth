#!/usr/bin/env python3
"""
Generate elements_data.js from elements.py data.

This script reads the element data (binding energies and shell cross-section data)
and outputs a JavaScript file for use in the interactive web application.
"""

import pandas as pd
import os
import json

# Set up data directory path
data_dir = "database"
output_file = "docs/elements_data.js"


def safe_read_csv(filename):
    """Safely read CSV file, return None if file doesn't exist"""
    filepath = os.path.join(data_dir, filename)
    if os.path.exists(filepath):
        return pd.read_csv(filepath, sep="\t", names=["Photon Energy", "cs0", "cs1", "cs2", "beta0", "beta1", "beta2"])
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


def df_to_shell_data(df):
    """Convert a pandas DataFrame to shell data dictionary"""
    return {
        "photon_energy": df["Photon Energy"].tolist(),
        "cs0": df["cs0"].tolist(),
        "cs1": df["cs1"].tolist(),
        "cs2": df["cs2"].tolist(),
        "beta0": df["beta0"].tolist(),
        "beta1": df["beta1"].tolist(),
        "beta2": df["beta2"].tolist()
    }


def read_auger_file(filename):
    """Read Auger data file and return list of Auger peak dictionaries
    
    File format: 'peak_name', kinetic_energy, 'channel', relative_intensity, 'origin'
    """
    filepath = os.path.join(data_dir, filename)
    if not os.path.exists(filepath):
        print(f"Note: {filename} not found, skipping Auger data")
        return []
    
    auger_peaks = []
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            # Parse the CSV-like format with quotes
            parts = [p.strip().strip("'") for p in line.split(',')]
            if len(parts) >= 5:
                try:
                    peak = {
                        "peak_name": parts[0],
                        "kinetic_energy": float(parts[1]),
                        "channel": parts[2].strip().strip("'"),
                        "relative_intensity": float(parts[3]),
                        "origin": parts[4].strip().strip("'")
                    }
                    auger_peaks.append(peak)
                except (ValueError, IndexError) as e:
                    print(f"Warning: Could not parse Auger line: {line} - {e}")
    
    return auger_peaks


def process_auger_data(auger_peaks, binding_energies):
    """Process Auger peaks - use relative_intensity factors directly.
    
    The relative_intensity values in the file are already the correct scaling
    factors. Each Auger peak intensity = origin_cross_section × relative_intensity.
    
    Returns list of processed Auger peak dictionaries.
    """
    if not auger_peaks:
        return []
    
    # Create processed peaks without normalization
    processed = []
    for peak in auger_peaks:
        origin = peak["origin"]
        
        # Find the binding energy key that contains this origin
        # e.g., "2p3/2" matches "L3 2p3/2" in Argon
        origin_binding_key = None
        for key in binding_energies:
            if origin in key or key == origin:
                origin_binding_key = key
                break
        
        if origin_binding_key is None:
            print(f"Warning: Could not find binding energy for Auger origin '{origin}'")
            continue
        
        # Use relative_intensity directly as the scaling factor
        processed.append({
            "peak_name": peak["peak_name"],
            "kinetic_energy": peak["kinetic_energy"],
            "channel": peak["channel"],
            "intensity_factor": peak["relative_intensity"],
            "origin": origin,
            "origin_binding_key": origin_binding_key
        })
    
    return processed


def build_element_data():
    """Build the complete elements data dictionary"""
    
    elements = {}
    
    # Neon
    neon_binding = {"1s": 870.2, "2s": 48.5, "2p1/2": 21.7, "2p3/2": 21.6}
    ne1s = safe_read_csv("ne1s.txt")
    ne2s = safe_read_csv("ne2s.txt")
    ne2p = safe_read_csv("ne2p.txt")
    # Divide 2p cross-section: 2p1/2 gets 1/3, 2p3/2 gets 2/3 (based on degeneracy)
    ne2p_1half = scale_cross_section(ne2p, 1/3)  # j=1/2 has 2 states
    ne2p_3half = scale_cross_section(ne2p, 2/3)  # j=3/2 has 4 states
    neon_shells = [ne1s, ne2s, ne2p_1half, ne2p_3half]
    
    # Load and process Neon Auger data
    neon_auger_raw = read_auger_file("neAuger.txt")
    neon_auger = process_auger_data(neon_auger_raw, neon_binding)
    
    elements["neon"] = {
        "name": "Neon",
        "symbol": "Ne",
        "binding_energies": neon_binding,
        "shell_data": [df_to_shell_data(df) for df in neon_shells],
        "auger_peaks": neon_auger
    }
    
    # Argon
    argon_binding = {
        "L1 2s": 326.3, "L2 2p1/2": 250.6, "L3 2p3/2": 248.4,
        "M1 3s": 29.3, "M2 3p1/2": 15.9, "M3 3p3/2": 15.7
    }
    ar2s = safe_read_csv("ar2s.txt")
    ar2p = safe_read_csv("ar2p.txt")
    ar3s = safe_read_csv("ar3s.txt")
    ar3p = safe_read_csv("ar3p.txt")
    # Divide cross-sections for p orbitals
    ar2p_1half = scale_cross_section(ar2p, 1/3)
    ar2p_3half = scale_cross_section(ar2p, 2/3)
    ar3p_1half = scale_cross_section(ar3p, 1/3)
    ar3p_3half = scale_cross_section(ar3p, 2/3)
    argon_shells = [ar2s, ar2p_1half, ar2p_3half, ar3s, ar3p_1half, ar3p_3half]
    
    # Load and process Argon Auger data
    argon_auger_raw = read_auger_file("arAuger.txt")
    argon_auger = process_auger_data(argon_auger_raw, argon_binding)
    
    elements["argon"] = {
        "name": "Argon",
        "symbol": "Ar",
        "binding_energies": argon_binding,
        "shell_data": [df_to_shell_data(df) for df in argon_shells],
        "auger_peaks": argon_auger
    }
    
    # Krypton
    krypton_binding = {
        "3s": 292.8, "3p1/2": 222.2, "3p3/2": 214.4, 
        "3d3/2": 95.0, "3d5/2": 93.8,
        "4s": 27.5, "4p1/2": 14.1, "4p3/2": 14.1
    }
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
    krypton_shells = [kr3s, kr3p_1half, kr3p_3half, kr3d_3half, kr3d_5half, kr4s, kr4p_1half, kr4p_3half]
    
    # Load and process Krypton Auger data
    krypton_auger_raw = read_auger_file("krAuger.txt")
    krypton_auger = process_auger_data(krypton_auger_raw, krypton_binding)
    
    elements["krypton"] = {
        "name": "Krypton",
        "symbol": "Kr",
        "binding_energies": krypton_binding,
        "shell_data": [df_to_shell_data(df) for df in krypton_shells],
        "auger_peaks": krypton_auger
    }

    #Xenon
    xenon_binding = {
        "M1 3s": 1148.7, "M2 3p1/2": 1002.1, "M3 3p3/2": 940.6, "M4 3d3/2": 689, "M5 3d5/2": 676.4,
        "N1 4s": 213.2, "N2 4p1/2": 146.7, "N3 4p3/2": 145.5, "N4 4d3/2": 69.5, "N5 4d5/2": 67.5,
        "O1 5s": 23.3, "O2 5p1/2": 13.4, "O3 5p3/2": 12.1
    }
    xe3s = safe_read_csv("xe3s.txt")
    xe3p = safe_read_csv("xe3p.txt")
    xe3d = safe_read_csv("xe3d.txt")
    xe4s = safe_read_csv("xe4s.txt")
    xe4p = safe_read_csv("xe4p.txt")
    xe4d = safe_read_csv("xe4d.txt")
    xe5s = safe_read_csv("xe5s.txt")
    xe5p = safe_read_csv("xe5p.txt")
    # Divide cross-sections for p and d orbitals
    xe3p_1half = scale_cross_section(xe3p, 1/3)
    xe3p_3half = scale_cross_section(xe3p, 2/3)
    xe3d_3half = scale_cross_section(xe3d, 2/5)
    xe3d_5half = scale_cross_section(xe3d, 3/5)
    xe4p_1half = scale_cross_section(xe4p, 1/3)
    xe4p_3half = scale_cross_section(xe4p, 2/3)
    xe4d_3half = scale_cross_section(xe4d, 2/5)
    xe4d_5half = scale_cross_section(xe4d, 3/5)
    xe5p_1half = scale_cross_section(xe5p, 1/3)
    xe5p_3half = scale_cross_section(xe5p, 2/3)
    xenon_shells = [xe3s, xe3p_1half, xe3p_3half, xe3d_3half, xe3d_5half, 
                    xe4s, xe4p_1half, xe4p_3half, xe4d_3half, xe4d_5half, 
                    xe5s, xe5p_1half, xe5p_3half]

    # Load and process Xenon Auger data
    xenon_auger_raw = read_auger_file("xeAuger.txt")
    xenon_auger = process_auger_data(xenon_auger_raw, xenon_binding)
    
    elements["xenon"] = {
        "name": "Xenon",
        "symbol": "Xe",
        "binding_energies": xenon_binding,
        "shell_data": [df_to_shell_data(df) for df in xenon_shells],
        "auger_peaks": xenon_auger
    }
    
    return elements


def generate_js_file(elements_data, output_path):
    """Generate the JavaScript file with elements data"""
    
    # Convert to JSON with nice formatting
    json_str = json.dumps(elements_data, indent=2)
    
    # Write the JS file
    js_content = f"""// Element data for interactive plotting
// Auto-generated by generate_elements_data.py
const ELEMENTS_DATA = {json_str};
"""
    
    with open(output_path, 'w') as f:
        f.write(js_content)
    
    print(f"Generated {output_path}")
    print(f"  Elements: {', '.join(elements_data.keys())}")
    for key, elem in elements_data.items():
        auger_count = len(elem.get('auger_peaks', []))
        print(f"  - {elem['name']}: {len(elem['binding_energies'])} shells, {auger_count} Auger peaks")


def main():
    print("Generating elements_data.js from database files...")
    print()
    
    # Build the data
    elements_data = build_element_data()
    
    # Generate the output file
    generate_js_file(elements_data, output_file)
    
    print()
    print("Done!")


if __name__ == "__main__":
    main()
