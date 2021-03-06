const Fuse = require('fuse.js');
const SaratogaUpdater = require('../updater/SaratogaUpdater');
const SaratogaShips = require('./SaratogaShips');
const SaratogaEquipments = require('./SaratogaEquipments');
const SaratogaUtil = require('../util/SaratogaUtil');

/**
 * Saratoga, the starting point of this API
 * @class SaratogaStore
 */
class SaratogaStore {
    /**
     * @param  {Saratoga} saratoga The saratoga class that generated this instance
     */
    constructor(saratoga) {
        /**
         * The saratoga instance that generated this instance
         * @type {Saratoga}
         */
        this.saratoga = saratoga;
        /**
         * Ship related getters for this store
         * @type {SaratogaShips}
         */
        this.ships = new SaratogaShips(this);
        /**
         * Equipment related getters for this store
         * @type {SaratogaEquipments}
         */
        this.equipments = new SaratogaEquipments(this);
        /**
         * Updater Class for the local data for this store
         * @type {SaratogaUpdater}
         */
        this.updater = new SaratogaUpdater(this);
        /**
         * If this store is already ready to operate
         * @type {Boolean}
         */
        this.ready = false;

        Object.defineProperty(this, '_shipCache', { value: null, writable: true });
        Object.defineProperty(this, '_equipCache', { value: null, writable: true  });

        this.updater.startUpCheck();
        this.updateOnFirstStartUp()
            .then(() => {
                if (this.saratoga.ready) return;
                this.updater._startCronUpdate();
                this.ready = true;
                this.saratoga.emit('ready');
            })
            .catch((error) =>
                this.saratoga.emit('error', error)
            );
    }

    async updateOnFirstStartUp() {
        if (this.ready) return;
        let update = await this.updater.checkForUpdate();
        update = update.shipUpdateAvailable || update.equipmentUpdateAvailable;
        if (update && (!this._shipCache || !this._equipCache)) await this.updater.updateDataAndCache();
        this.saratoga.emit('debug', `Loaded ${this._shipCache.list.length} stored ships from ${SaratogaUtil.shipFilePath()}`);
        this.saratoga.emit('debug', `Loaded ${this._equipCache.list.length} stored equipments from ${SaratogaUtil.equipFilePath()}`);
    }

    loadShipsCache(rawShips) {
        if (!rawShips) return;
        rawShips = Object.values(rawShips);
        if (!rawShips.length) return;
        this.clearShipsCache();
        this._shipCache = new Fuse(rawShips, { keys: [ 'names.en', 'names.cn', 'names.jp', 'names.kr' ], threshold: 0.4 });
    }

    loadEquipmentsCache(rawEquips) {
        if (!rawEquips) return;
        rawEquips = Object.values(rawEquips);
        if (!rawEquips.length) return;
        this.clearEquipmentsCache();
        this._equipCache = new Fuse(rawEquips, { keys: [ 'names.en', 'names.cn', 'names.jp', 'names.kr' ], threshold: 0.4 });
    }

    clearShipsCache() {
        this._shipCache = null;
    }

    clearEquipmentsCache() {
        this._equipCache = null;
    }

    updateShipsData(data) {
        return SaratogaUtil.writeFile(SaratogaUtil.shipFilePath(), typeof data === 'string' ? data : JSON.stringify(data));
    }

    updateEquipmentsData(data) {
        return SaratogaUtil.writeFile(SaratogaUtil.equipFilePath(), typeof data === 'string' ? data : JSON.stringify(data));
    }

    clearShipsData() {
        return SaratogaUtil.writeFile(SaratogaUtil.shipFilePath(), JSON.stringify({}));
    }

    clearEquipmentsData() {
        return SaratogaUtil.writeFile(SaratogaUtil.equipFilePath(), JSON.stringify({}));
    }
}
module.exports = SaratogaStore;
