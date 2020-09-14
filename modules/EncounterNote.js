/*
Extend the placeable Map Note - select the desired tokens and then tap the Quick Encounters button
Subsequently can add: (a) Drag additional tokens in, (b) populate the Combat Tracker when you open the note?
27-Aug-2020   Created
30-Aug-2020   Added EncounterNoteConfig
13-Sep-2020    QuickEncounter.deleteNote moved/renamed to EncounterNote.delete
                QuickEncounter.placeNote moved/renamed to EncounterNote.place
                Fixed flow of deleteJournalEntry --> delete associated Note
14-Sep-2020     Display simple dialog when you delete the Map Note corresponding to a Quick Encounter Journal Entry
*/


import {MODULE_NAME, SCENE_ID_FLAG_KEY, TOKENS_FLAG_KEY} from './QuickEncounter.js';
import {QuickEncounter} from './QuickEncounter.js';

//Expand the available list of Note icons
const moreNoteIcons = {
    "Combat" : "icons/svg/combat.svg"
}
Object.assign(CONFIG.JournalEntry.noteIcons, moreNoteIcons);



export class EncounterNoteConfig extends NoteConfig {
    /** @override  */
    static get defaultOptions() {
    	  const options = super.defaultOptions;
    	  options.id = "encounter-note-config";
          options.title = game.i18n.localize("QE.NOTE.ConfigTitle");
    	  return options;
    }
}

export class EncounterNote{
    static async create(journalEntry, noteAnchor) {
        if (!journalEntry) {return;}
        // Create Note data
        const noteData = {
              entryId: journalEntry.id,
              x: noteAnchor.x,
              y: noteAnchor.y,
              icon: CONFIG.JournalEntry.noteIcons.Combat,
              iconSize: 80,
              iconTint: "#FF0000",  //Red
              //Don't specify the name so it inherits from the Journal
              textAnchor: CONST.TEXT_ANCHOR_POINTS.TOP,
              fontSize: 24
        };

        //Use new Note rather than Note.create because this won't be persisted
        //Until the GM "saves" the Note
        //This uses the same approach as JournalEntry._onDropData
        let newNote = new Note(noteData);

        newNote._sheet = new EncounterNoteConfig(newNote);

        return newNote;

    }

    static async delete(journalEntry) {
        if (!game.user.isGM) {return;}
        if (QuickEncounter.hasEncounter(journalEntry)) {
            //Find the corresponding Map note - have to switch to the correct scene first
            const sceneID = journalEntry.getFlag(MODULE_NAME, SCENE_ID_FLAG_KEY);
            const scene = game.scenes.get(sceneID);
            if (!scene) {return;}
            await scene.view();
            const note = journalEntry.sceneNote;
            const noteName = note.name;

            //Delete the note from the viewed scene
            if (note) {
                Dialog.prompt({
                  title: "Deleted Quick Encounter Map Note",
                  content: "Because you deleted the Quick Encounter Journal Entry I also deleted the associated Map Note",
                  label : "",
                  callback : () => {console.log(`Deleted Map Note ${noteName}`);},
                  options: {
                    top:  window.innerHeight - 350,
                    left: window.innerWidth - 720,
                    width: 400,
                    jQuery: false
                  }
                });
                canvas.notes.deleteMany([note.id]);
            }
        }
    }

    static async place(qeJournalEntry) {
        const savedTokens = QuickEncounter.getEncounterTokensFromJournalEntry(qeJournalEntry);
        //Create a Map Note for this encounter
        if (savedTokens && savedTokens.length) {
            const noteAnchor = {
                x: savedTokens[0].x,
                y: savedTokens[0].y
            }

            // Validate the final position is in-bounds
            if (canvas.grid.hitArea.contains(noteAnchor.x, noteAnchor.y) ) {

                // Create a NoteConfig sheet instance to finalize the creation
                //Don't activate the note toolbar section since we want to define more
                //canvas.notes.activate();
                const newNote = await EncounterNote.create(qeJournalEntry, noteAnchor);
                const note = canvas.notes.preview.addChild(newNote);
                await note.draw();  //Draw the new Note on the canvas and add listeners
                note.sheet.render(true);
            }
        }
    }

}

//Delete a corresponding Map Note if you delete the Journal Entry
Hooks.on("deleteJournalEntry", EncounterNote.delete);

Hooks.on(`renderEncounterNoteConfig`, async (noteConfig, html, data) => {
    const saveEncounterMapNote = game.i18n.localize("QE.BUTTON.SaveEncounterMapNote");
    html.find('button[name="submit"]').text(saveEncounterMapNote);
});
