#!/usr/bin/env node
/**
 * Décompte du stock des plats « Dispo express ».
 * Lit dispo.json, soustrait les quantités commandées au bon plat (match par nom),
 * plancher à 0. Ne touche QUE les plats dont le stock est un nombre (stock suivi).
 * Les plats sans stock (null/absent = pas de limite) et les photos ne sont jamais modifiés.
 *
 * Entrée : variable d'environnement PLATS_JSON = tableau des lignes commandées,
 * chaque ligne : { nomPlat, quantite, dispo }. Seules les lignes dispo===true comptent.
 */
const fs = require("fs");
const path = require("path");

const FICHIER = path.join(process.cwd(), "dispo.json");

function norm(s){ return String(s == null ? "" : s).trim(); }

function main(){
  let lignes;
  try {
    lignes = JSON.parse(process.env.PLATS_JSON || "[]");
  } catch (e) {
    console.error("PLATS_JSON illisible :", e.message);
    process.exit(0); // on ne casse rien
  }
  if (!Array.isArray(lignes)) lignes = [];

  // Agrège les quantités commandées par nom de plat dispo
  const commandes = {};
  lignes.forEach(function(l){
    if (!l || l.dispo !== true) return;
    const nom = norm(l.nomPlat || l.nom);
    const q = parseInt(l.quantite, 10);
    if (!nom || !(q > 0)) return;
    commandes[nom] = (commandes[nom] || 0) + q;
  });

  if (!Object.keys(commandes).length){
    console.log("Aucune ligne dispo à décompter.");
    process.exit(0);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(FICHIER, "utf8"));
  } catch (e) {
    console.error("dispo.json illisible :", e.message);
    process.exit(0);
  }
  if (!Array.isArray(data.plats)){
    console.log("dispo.json : pas de tableau 'plats', rien à faire.");
    process.exit(0);
  }

  let modifie = false;
  data.plats.forEach(function(p){
    const nom = norm(p.nom || p.plats);
    if (!(nom in commandes)) return;
    if (typeof p.stock !== "number") return; // stock non suivi : on ne touche pas
    const avant = p.stock;
    p.stock = Math.max(0, p.stock - commandes[nom]);
    if (p.stock !== avant){
      modifie = true;
      console.log("Plat « " + nom + " » : " + avant + " -> " + p.stock + " (-" + commandes[nom] + ")");
    }
  });

  if (!modifie){
    console.log("Aucun stock suivi correspondant — fichier inchangé.");
    process.exit(0);
  }

  fs.writeFileSync(FICHIER, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("dispo.json mis à jour.");
}

main();
