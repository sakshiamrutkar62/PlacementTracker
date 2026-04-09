'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Internship extends Model {
        static associate(models) {
            Internship.hasMany(models.Application, { foreignKey: 'internshipId' });
            // Company association removed - table doesn't have companyId column
        }
    }
    Internship.init({
        company_name: DataTypes.STRING,
        role_title: DataTypes.STRING,
        description: DataTypes.TEXT,
        stipend: DataTypes.STRING,
        duration: DataTypes.STRING,
        mode: DataTypes.STRING,
        type: DataTypes.STRING,
        location: DataTypes.STRING,
        required_skills: DataTypes.ARRAY(DataTypes.TEXT),
        deadline: DataTypes.DATE,
        posted_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'Internship',
        tableName: 'internships',
        underscored: true,
        timestamps: false
    });
    return Internship;
};