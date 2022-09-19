/**
 * This class represents the art gallery for a given actor
 * @extends FormApplication
 */
export default class ArtGalleryManager extends FormApplication {
  /**
   * @constructor
   * @param {Actor} object the actor
   * @param {object} options the rendering options
   *
   */
  constructor(object, options = {}) {
    super(object, options);
    /** @type {boolean} Whether the manager is in edit mode or not   */
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
      submitOnClose: false,
    });
  }

  get title() {
    return game.i18n.localize('AG.Gallery');
  }

  /** @returns {Actor} the actor */
  get actor() {
    return this.object;
  }

  /** @returns {Array<TokenDocument>} the actors' active tokens*/
  get tokens() {
    return this.actor.getActiveTokens(false, true);
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

  /**
   * @override
   * @private
   * @param {Event} event - The form submission event
   * @param {FormData} formData - the submitted FormData
   */
  async _updateObject(_event, formData) {
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
   * @private
   * @param {jQuery<HTMLElement>} html the HTML element
   * @returns the constructed context menu
   */
  _contextmenu(html) {
    const selector = '.artpiece .menu';
    const options = { eventName: 'click' };
    const items = [
      {
        name: 'AG.SetCharArt',
        icon: '<i class="fas fa-sign-out-alt"></i>',
        condition: this.editMode,
        callback: this._onSetCharArt.bind(this),
      },
      {
        name: 'AG.SetPrototypeTokenArt',
        icon: '<i class="fas fa-sign-out-alt"></i>',
        condition: this.editMode,
        callback: this._onSetPrototypeTokenArt.bind(this),
      },
      {
        name: 'AG.SetActiveTokenArt',
        icon: '<i class="fas fa-sign-out-alt"></i>',
        condition: this.editMode && this.tokens.length > 0,
        callback: this._onSetActiveTokenArt.bind(this),
      },
      {
        name: 'Delete',
        icon: '<i class="fas fa-trash"></i>',
        condition: this.editMode,
        callback: this._onDeleteArtpiece.bind(this),
      },
    ];

    return new ContextMenu(html, selector, items, options);
  }

  /**
   * Handle setting of actor image
   * @private
   * @param {jQuery<HTMLListItem>} li - the selected item from the menu
   */
  async _onSetCharArt(li) {
    const id = li.parents('.artpiece').data('id');
    const artpiece = this._getArtpieceFromGallery(id);
    this.actor.update({ img: artpiece.img });
  }

  /**
   * Handle setting of prototype token image
   * @private
   * @param {jQuery<HTMLListItem>} li - the selected item from the menu
   */
  async _onSetPrototypeTokenArt(li) {
    const id = li.parents('.artpiece').data('id');
    const artpiece = this._getArtpieceFromGallery(id);
    const isLinked = this.actor.prototypeToken?.actorLink;
    if (isLinked) {
      //handle linked tokens
      await this.actor.update({ 'token.img': artpiece.img });
    } else {
      //handle unlinked tokens
      const actorId = this.actor?.token?.actorId;
      const actor = game.actors.get(actorId, {
        strict: true,
      });
      await actor.update({ 'token.img': artpiece.img });
    }
  }

  /**
   * Handle setting of active token image
   * @private
   * @param {jQuery<HTMLListItem>} li - the selected item from the menu
   */
  async _onSetActiveTokenArt(li) {
    const id = li.parents('.artpiece').data('id');
    const artpiece = this._getArtpieceFromGallery(id);
    for (const token of this.tokens) {
      await token.update({ img: artpiece.img });
    }
  }

  /**
   * Handle deletion of art piece
   * @private
   * @param {jQuery<HTMLListItem>} li - the selected item from the menu
   */
  async _onDeleteArtpiece(li) {
    const element = li.parents('.artpiece');
    const id = element.data('id');
    await this._deleteArtFromGallery(id);
    element.slideUp(200, () => this.render(true));
  }
}
