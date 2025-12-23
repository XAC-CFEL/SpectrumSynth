import matplotlib.pyplot as plt
import pandas as pd
from collections import defaultdict

def synthSpectrum(element, setPhoton,emax=1000,emin=0,ret=0):
    for eV in setPhoton:
        height=[]
        betas = []
        cs=[]
        pos = eV - element[1].iloc[0,:].values -ret
        mask = pos > 0
        eKin = pos[mask]
        shell = element[1].columns[mask]
        for e,orbital in zip(eKin,element[2]):
            nearestIdx = (orbital["Photon Energy"] - e).abs().idxmin()
            nearestRow = orbital.loc[nearestIdx]
            height =  nearestRow["cs0"]
            beta = nearestRow["beta0"]
            betas.append(beta)
            cs.append(height)
        
        height_counter = defaultdict(int)
        labels_by_x = defaultdict(list)
        for x_val, shell_label in zip(eKin, shell):
            labels_by_x[x_val].append(shell_label)

        for x_val, label_list in labels_by_x.items():
            if emax > x_val > emin:
                idx = list(eKin).index(x_val)
        
                # shell labels above the bar
                plt.text(
                    x_val,
                    cs[idx] * 1.05,
                    ", ".join(label_list),
                    ha="left",
                    va="bottom",
                    fontsize=8,
                    rotation=45
                )
        
                # beta0 below the bar
                plt.text(
                    x_val,
                    cs[idx] * 0.8,   # below the top, works with log scale
                    f"β={betas[idx]:.2f}",
                    ha="left",
                    va="bottom",
                    fontsize=7,
                    rotation=45
                )
                
        plt.xlim(emax,emin)
        plt.yscale("log")
        plt.title(f"{element[0]}")
        plt.xlabel("Energy in eV")
        plt.ylabel("Crosssection")
        plt.bar(eKin,cs,alpha=0.75)
