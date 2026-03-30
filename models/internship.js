'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Internship extends Model {
        static associate(models) {
            Internship.hasMany(models.Application, { foreignKey: 'internshipId' });
            Internship.belongsTo(models.Company, { foreignKey: 'companyId' });
        }
    }
    Internship.init({
        company_name: DataTypes.STRING,
        role_title: DataTypes.STRING,
        stipend: DataTypes.STRING,
        type: DataTypes.STRING,
        location: DataTypes.STRING,
        required_skills: DataTypes.JSONB,
        application_deadline: DataTypes.DATE,
        posted_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        companyId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'companies',
                key: 'id'
            }
        }
    }, {
        sequelize,
        modelName: 'Internship',
        tableName: 'internships',
    });
    return Internship;
};