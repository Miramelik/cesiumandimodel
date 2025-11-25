import { IModelConnection } from "@itwin/core-frontend";
import {QueryRowFormat} from "@itwin/core-common"

/**
 * Interface for IFC element statistics
 */
export interface IFCElementStats {
  walls: number;
  doors: number;
  windows: number;
  slabs: number;
  columns: number;
  beams: number;
  spaces: number;
  furniture: number;
}

/**
 * Query IFC elements from the iModel and return statistics
 */
export class IFCElementQuery {
  /**
   * Get counts of different IFC element types
   */
  public static async getElementStats(
    iModel: IModelConnection
  ): Promise<IFCElementStats> {
    const stats: IFCElementStats = {
      walls: 0,
      doors: 0,
      windows: 0,
      slabs: 0,
      columns: 0,
      beams: 0,
      spaces: 0,
      furniture: 0,
    };

    try {
      // Query for walls (IfcWall, IfcWallStandardCase)
      stats.walls = await this.countElementsByClass(iModel, [
        "IFCDynamic.ifcwall",
      ]);

      // Query for doors
      stats.doors = await this.countElementsByClass(iModel, [
        "IFCDynamic.ifcdoor",
      ]);

      // Query for windows
      stats.windows = await this.countElementsByClass(iModel, [
        "IFCDynamic.ifcwindow",
      ]);

      // Query for slabs
      stats.slabs = await this.countElementsByClass(iModel, [
        "IFCDynamic.ifcslab",
      ]);

      // Query for columns
      stats.columns = await this.countElementsByClass(iModel, [
        "IFCDynamic.ifccolumn",
      ]);

      // Query for beams
      stats.beams = await this.countElementsByClass(iModel, [
        "IFCDynamic.ifcbeam",
      ]);

      // Query for spaces
      stats.spaces = await this.countElementsByClass(iModel, [
        "IFCDynamic.ifcspace",
      ]);

      // Query for furniture
      stats.furniture = await this.countElementsByClass(iModel, [
        "IFCDynamic.ifcfurniture",
      ]);

    

      console.log("IFC Element Stats:", stats);
      return stats;
    } catch (error) {
      console.error("Error querying IFC elements:", error);
      return stats;
    }
  }

  /**
   * Count elements by their IFC class names
   */
  private static async countElementsByClass(
    iModel: IModelConnection,
    classNames: string[]
  ): Promise<number> {
    try {
      const classConditions = classNames
        .map((className) => `ec_classname(ECClassId, '${className}')`)
        .join(" OR ");

      const query = `
        SELECT COUNT(*) as count 
        FROM BisCore.GeometricElement3d 
        WHERE ${classConditions}
      `;

      const results = iModel.createQueryReader(query, undefined, {
        rowFormat: QueryRowFormat.UseJsPropertyNames,
      });

      const rows = await results.toArray();
      return rows.length > 0 ? (rows[0].count || 0) : 0;
    } catch (error) {
      console.error(`Error counting elements for ${classNames}:`, error);
      return 0;
    }
  }

  /**
   * Get detailed information about specific element types
   */
  public static async getElementDetails(
    iModel: IModelConnection,
    elementType: string
  ): Promise<any[]> {
    try {
      const query = `
        SELECT 
          ECInstanceId,
          CodeValue,
          UserLabel,
          ec_classname(ECClassId, 's') as ClassName
        FROM BisCore.GeometricElement3d 
        WHERE ec_classname(ECClassId, 'IFCDynamic.${elementType.toLowerCase()}')
        LIMIT 100
      `;

      const results = iModel.createQueryReader(query, undefined, {
        rowFormat: QueryRowFormat.UseJsPropertyNames,
      });

      return await results.toArray();
    } catch (error) {
      console.error(`Error getting details for ${elementType.toLowerCase()}:`, error);
      return [];
    }
  }

  /**
   * Get all available IFC classes in the model
   */
  public static async getAvailableIFCClasses(
    iModel: IModelConnection
  ): Promise<string[]> {
    try {
      const query = `
        SELECT DISTINCT ec_classname(ECClassId, 's') as ClassName
        FROM BisCore.GeometricElement3d
        WHERE ec_classname(ECClassId) LIKE 'IFCDynamic.%'
      `;

      const results = iModel.createQueryReader(query, undefined, {
        rowFormat: QueryRowFormat.UseJsPropertyNames,
      });

      const rows = await results.toArray();
      return rows.map((row) => row.className);
    } catch (error) {
      console.error("Error getting IFC classes:", error);
      return [];
    }
  }
}