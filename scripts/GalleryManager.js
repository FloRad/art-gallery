/**
 * This class represents the art gallery for a given actor
 * @extends FormApplication
 */
export default class ArtGalleryManager extends FormApplication {
    /** @type {boolean} Whether the manager is in edit mode or not   */
    editMode;

    /**
     * @constructor
     * @param {Actor} object the actor
     * @param {object} options the rendering options
     *
     */
    constructor(object, options = {}) {
        super(object, options);
        this.editMode = options.editMode || object.isOwner;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['gallery'],
            width: 800,
            height: 'auto',
            id: 'art-gallery-manager',
            template: 'modules/art-gallery/templates/manager.hbs',
            resizable: true,
            closeOnSubmit: false,
            submitonClose: false,
        });
    }

    get title() {
        return game.i18n.localize('AG.Gallery');
    }

    get actor() {
        return this.object;
    }

    /**
     * @override
     * @param {jQuery} html
     */
    activateListeners(html) {
        super.activateListeners(html);
        this._contextmenu(html);

        //pop out a piece of art
        html.find('.artpiece img').on('click', (ev) => {
            const id = $(ev.currentTarget).parents('.artpiece').data('id');
            const artpiece = this._getArtpieceFromGallery(id);
            new ImagePopout(artpiece.img, {
                title: `${this.actor.name} - ${artpiece.title}`,
                shareable: true,
                uuid: this.actor.uuid,
            }).render(true);
        });

        //edit title and description
        html.find('[contenteditable="true"]').on('focusout', async (ev) => {
            const element = ev.currentTarget;
            const id = $(element).parents('.artpiece').data('id');
            //get the target prop and the new text
            const target = element.dataset.target;
            const newText = element.innerText;
            const gallery = this._getGallery();
            const artpiece = gallery.find((a) => a.id === id);
            if (!!artpiece && artpiece[target] !== newText) {
                artpiece[target] = newText;
                await this._setGallery(gallery);
                this.render(true);
            }
        });
    }

    /**
     * @override
     * @returns the data object
     */
    async getData() {
        const data = super.getData();
        data.editMode = this.editMode;
        data.canDelete = this.actor.owner;
        data.gallery = this._getGallery();
        data.canBrowse = this._canUserBrowseFiles();
        return data;
    }

    async _updateObject(event, formData) {
        const gallery = this._getGallery();
        gallery.push({ id: randomID(), ...formData });
        await this._setGallery(gallery);
        this.render(true);
    }

    /**
     * @private
     * @returns {Array} The gallery
     */
    _getGallery() {
        return this.actor.getFlag('art-gallery', 'gallery') || [];
    }

    /**
     * @private
     * @param {string} id the id of the artpiece
     * @returns the artpiece
     */
    _getArtpieceFromGallery(id) {
        const gallery = this._getGallery();
        return gallery.find((i) => i.id === id);
    }

    /**
     * @private
     * @param {Array} gallery
     */
    async _setGallery(gallery) {
        await this.actor.setFlag('art-gallery', 'gallery', gallery);
    }

    /**
     * @private
     * @returns {boolean} Whether the user can browse Files
     */
    _canUserBrowseFiles() {
        return game.user.can('FILES_BROWSE');
    }

    /**
     * @private
     * @param {String} id the id of the artpiece to remove
     * @returns {Array} the adjusted gallery
     */
    async _deleteArtFromGallery(id) {
        const gallery = this._getGallery();
        //find the piece
        const obj = gallery.find((a) => a.id === id);
        const index = gallery.indexOf(obj);
        if (index > -1) {
            //splice it out of the array
            gallery.splice(index, 1);
        }
        return this._setGallery(gallery);
    }

    /**
     * Construct a contextmenu
     * @param {jQuery} html the HTML element
     * @returns the constructed context menu
     */
    _contextmenu(html) {
        const selector = '.artpiece .menu';
        const items = [
            {
                name: 'AG.SetCharArt',
                icon: '<i class="fas fa-sign-out-alt"></i>',
                condition: this.editMode,
                callback: (li) => {
                    const id = li.parents('.artpiece').data('id');
                    const artpiece = this._getArtpieceFromGallery(id);
                    this.actor.update({ img: artpiece.img });
                },
            },
            {
                name: 'AG.SetTokenArt',
                icon: '<i class="fas fa-sign-out-alt"></i>',
                condition: this.editMode,
                callback: (li) => {
                    const id = li.parents('.artpiece').data('id');
                    const artpiece = this._getArtpieceFromGallery(id);
                    this.actor.update({ 'token.img': artpiece.img });
                },
            },
            {
                name: 'Delete',
                icon: '<i class="fas fa-trash"></i>',
                condition: this.editMode,
                callback: async (li) => {
                    const element = li.parents('.artpiece');
                    const id = element.data('id');
                    await this._deleteArtFromGallery(id);
                    element.slideUp(200, () => {
                        this.render(true);
                    });
                },
            },
        ];
        const options = {
            // eventName: 'click',
        };
        return new ContextMenu(html, selector, items, options);
    }
}
