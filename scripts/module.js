import * as config from "./config.js";

class TableNinja extends Application {

    id = "table-ninja-prime";
    title = "Table Ninja";
    template = config.templatePaths.main;
    tableNinjaFolderName = "Table Ninja";

    static get defaultOptions() {
        const options = super.defaultOptions
        options.width = 480;
        options.height = 600;
        options.resizable = true;
        return options;
    }

    getData() {
        return {
            data: this.data
        }
    }

    constructor(options = {}) {
        super(options);
        this.data = game.folders.filter(x => x.data.type == "RollTable").find(b => b.name === this.tableNinjaFolderName);
        this.refresh();
        this.tabs = new Tabs({navSelector: ".tabs", contentSelector: ".content", initial: "tab1"});
        //this.tabs.bind(html);
    }

    toggleOpen() {

        // Clicking on the button toggles the application view.
        if (game.user.isGM) {
            if (this.rendered) {
                this.close();
            } else {
                this.render(true);
            }
        }

    }

    async refresh() {
        this.initData(this.data).then((promise) => {
            this.data = promise;
            this.render();
        });
    }

    async initData(folder = null) {

        let tables = folder.content;
        let subFolders = folder.children;
        folder.isFolder = true;
        
        // Erase child entities and combine folders and tables.
        folder.childEntities = [];
        for (let i = 0; i < subFolders.length; i++) {
            let subFolder = subFolders[i];
            this.initData(subFolder).then((promise) => {
                folder.childEntities.push(promise);
            })
        }
        for (let i = 0; i < tables.length; i++) {
            let table = tables[i];
            if (typeof table.ninjaRoll === "undefined") {
                table.ninjaRoll = async function () {
                    return this.drawMany(config.numberOfRolls, {displayChat: false}).then((promise) => {
                        this.rolls = promise.results;
                        this.selected = 0;
                        return this;
                    });
                }
            }
            table.ninjaRoll().then((promise) => {
                folder.childEntities.push(promise);
            });
        }

        return folder;
    
    }

    rollOneTable(id) {
        let table = game.tables.find(b => b.id === id);
        table.ninjaRoll().then(() => {
            this.render();
        });
    }

    choose(id) {
        let element = document.getElementById(id);
        element.classList.add("table-ninja-choosing");
    }    

    updateText(id, index, newText) {
        document.getElementById("ninja-" + id).innerHTML = newText;
        document.getElementById("ninja-choose-" + id).classList.remove('table-ninja-choosing');
        let table = game.tables.find(b => b.id === id);
        table.selected = index;
        this.render();
    }

}

Hooks.on("renderSceneControls", async (app, html, data) => {

    // Add a button to the scene controls for quick access. Using @errational's hack to avoid adding a layer. May break at some point.
    const tableNinjaButtonHtml = await renderTemplate(`modules/table-ninja/templates/button.hbs`);
    html.append(tableNinjaButtonHtml);
    const tableNinjaButton = html.find("li[data-control='table-ninja']");
    tableNinjaButton.on("click", event => ui.tableNinja.toggleOpen());

});

Hooks.once('ready', async function() {
    ui.tableNinja = new TableNinja();
});

Hooks.once("init", function () {
    preloadHandlebarsTemplates();
});

async function preloadHandlebarsTemplates() {
    return loadTemplates(Object.values(config.templatePaths));
};

Handlebars.registerHelper('tableNinjaSelectedText', function (table) {
    return table.rolls[table.selected].text;
})

Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {

    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=':
            return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case '!==':
            return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }

});
