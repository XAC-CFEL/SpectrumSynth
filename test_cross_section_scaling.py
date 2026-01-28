#!/usr/bin/env python3
"""
Test script to verify the cross-section scaling functionality
"""

import pandas as pd
from elements import scale_cross_section, ne2p

# Original 2p data
print("Original ne2p cross-section data (first 5 rows):")
print(ne2p[["Photon Energy", "cs0", "cs1", "cs2"]].head())
print(f"\nSum of cs0 for 2p orbital: {ne2p['cs0'].sum():.4f}")

# Scaled versions
ne2p_1half = scale_cross_section(ne2p, 1/3)
ne2p_3half = scale_cross_section(ne2p, 2/3)

print("\n" + "="*60)
print("2p1/2 orbital (scaled by 1/3):")
print(ne2p_1half[["Photon Energy", "cs0", "cs1", "cs2"]].head())
print(f"Sum of cs0 for 2p1/2: {ne2p_1half['cs0'].sum():.4f}")

print("\n" + "="*60)
print("2p3/2 orbital (scaled by 2/3):")
print(ne2p_3half[["Photon Energy", "cs0", "cs1", "cs2"]].head())
print(f"Sum of cs0 for 2p3/2: {ne2p_3half['cs0'].sum():.4f}")

print("\n" + "="*60)
print("Verification:")
print(f"2p1/2 + 2p3/2 = {ne2p_1half['cs0'].sum():.4f} + {ne2p_3half['cs0'].sum():.4f}")
print(f"              = {(ne2p_1half['cs0'].sum() + ne2p_3half['cs0'].sum()):.4f}")
print(f"Original 2p   = {ne2p['cs0'].sum():.4f}")
print(f"Match: {abs((ne2p_1half['cs0'].sum() + ne2p_3half['cs0'].sum()) - ne2p['cs0'].sum()) < 0.0001}")
