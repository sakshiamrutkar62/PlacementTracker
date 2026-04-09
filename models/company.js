'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Company extends Model {
        static associate(models) {
            // Association removed - internships table doesn't have companyId column
        }
    }
    Company.init({
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        description: DataTypes.TEXT,
        website: DataTypes.STRING,
        logo_url: DataTypes.STRING
    }, {
        sequelize,
        modelName: 'Company',
        tableName: 'companies',
    });
    return Company;
};