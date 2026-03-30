'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Application extends Model {
        static associate(models) {
            Application.belongsTo(models.User, { foreignKey: 'userId' });
            Application.belongsTo(models.Internship, { foreignKey: 'internshipId' });
        }
    }
    Application.init({
        status: {
            type: DataTypes.ENUM('applied', 'shortlisted', 'rejected', 'hired'),
            defaultValue: 'applied'
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        internshipId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'internships',
                key: 'id'
            }
        }
    }, {
        sequelize,
        modelName: 'Application',
        tableName: 'applications',
    });
    return Application;
};