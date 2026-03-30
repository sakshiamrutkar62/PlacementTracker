'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Company extends Model {
        static associate(models) {
            Company.hasMany(models.Internship, { foreignKey: 'companyId' });
        }
    }
    Company.init({
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