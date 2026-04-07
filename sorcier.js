const { fields } = foundry.data;

class PersonnageData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const carac = (valeurDefaut) => new fields.SchemaField({
      valeur: new fields.NumberField({ initial: valeurDefaut, min: 0, integer: true })
    });
    const comp = () => new fields.SchemaField({
      valeur: new fields.NumberField({ initial: 0, min: 0, integer: true })
    });

    return {
      caracteristiques: new fields.SchemaField({
        esprit: carac(1),
        coeur:  carac(1),
        corps:  carac(1),
        magie:  carac(1)
      }),
      competences: new fields.SchemaField({
        bluff:      comp(),
        farce:      comp(),
        tactique:   comp(),
        rumeur:     comp(),
        bagarre:    comp(),
        endurance:  comp(),
        perception: comp(),
        precision:  comp(),
        decorum:    comp(),
        discretion: comp(),
        persuasion: comp(),
        romance:    comp()
      })
    };
  }
}

const SORCIER = {
  caracteristiques: ["esprit", "coeur", "corps", "magie"],
  competences: {
    "esprit-coeur": ["bluff", "farce", "tactique", "rumeur"],
    "esprit-corps": ["bagarre", "endurance", "perception", "precision"],
    "coeur-corps": ["decorum", "discretion", "persuasion", "romance"]
  }
};

class ActeurSorcier extends Actor {
  prepareData() {
    super.prepareData();
    const carac = this.system.caracteristiques;

    // Calcul des pools de compétences
    this.system.pools = {
      "esprit-coeur": (carac.esprit.valeur || 0) + (carac.coeur.valeur || 0),
      "esprit-corps": (carac.esprit.valeur || 0) + (carac.corps.valeur || 0),
      "coeur-corps":  (carac.coeur.valeur  || 0) + (carac.corps.valeur || 0)
    };

    // Points dépensés par pool
    for (const [pool, liste] of Object.entries(SORCIER.competences)) {
      this.system.pools[pool + "_depenses"] = liste.reduce((total, comp) => {
        return total + (this.system.competences[comp]?.valeur || 0);
      }, 0);
    }
  }
}

class FeuilleSorcier extends ActorSheet {
  get template() {
    return "systems/tu-es-un-sorcier/templates/fiche-personnage.html";
  }

  getData() {
    const data = super.getData();
    data.SORCIER = SORCIER;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".jet-de").click(this._onJet.bind(this));
  }

  async _onJet(event) {
    const el = event.currentTarget;
    const carac = el.dataset.carac;
    const comp = el.dataset.comp;
    const caracVal = this.actor.system.caracteristiques[carac]?.valeur || 0;
    const compVal  = this.actor.system.competences[comp]?.valeur || 0;
    const total    = caracVal + compVal;

    const roll = await new Roll(`1d20 + ${total}`).evaluate();
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `Jet de ${comp} (${carac}) : 1d20 + ${total}`
    });
  }
}

Hooks.once("init", () => {
  CONFIG.Actor.documentClass = ActeurSorcier;
  Object.assign(CONFIG.Actor.dataModels, { personnage: PersonnageData });
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("tu-es-un-sorcier", FeuilleSorcier, {
    types: ["personnage"],
    makeDefault: true,
    label: "Fiche Personnage"
  });
});
