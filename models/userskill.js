'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class UserSkill extends Model {
        static associate(models) {
            UserSkill.belongsTo(models.User, { foreignKey: 'userId' });
            UserSkill.belongsTo(models.Skill, { foreignKey: 'skillId' });
        }
    }
    UserSkill.init({
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.BIGINT,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'id'
            }
        },
        skillId: {
            type: DataTypes.BIGINT,
            field: 'skill_id',
            references: {
                model: 'skills',
                key: 'id'
            }
        }
    }, {
        sequelize,
        modelName: 'UserSkill',
        tableName: 'user_skills',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });
    return UserSkill;
};